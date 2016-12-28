export type Opt<T> = T | undefined | void | null;

export type FastPromiseThis = Object | undefined | null;
export type FastPromiseCallback<R, T, Arg> = Opt<(val: T, arg?: Arg) => Opt<R | FastPromise<R>>>;

export const enum FastPromiseState{
    PENDING,
    RESOLVED,
    REJECTED,
    CANCELLED
}

const NativePromise: typeof Promise = typeof Promise == 'function' ? Promise : (function () {} as any);

export default class FastPromise<T> {
    static readonly [Symbol.species]: Function;
    readonly [Symbol.toStringTag]: "Promise";

    protected static promiseStack: FastPromise<any>[] = [];
    protected static promiseStackPos = 0;
    protected static promiseRunnerInWork = false;

    protected static addPromiseChildrenToStack(promise: FastPromise<{}>) {
        if (promise.children) {
            for (let i = 0; i < promise.children.length; i++) {
                const childPromise = promise.children[i];
                this.promiseStack[this.promiseStackPos] = promise;
                this.promiseStack[this.promiseStackPos + 1] = childPromise;
                this.promiseStackPos += 2;
            }
        }
        this.promiseRunner();
    }

    protected static promiseRunner() {
        if (this.promiseRunnerInWork) {
            return;
        }
        this.promiseRunnerInWork = true;
        let promiseStack = this.promiseStack;
        for (let i = 0; i < this.promiseStackPos; i += 2) {
            const parentPromise = promiseStack[i];
            const promise = promiseStack[i + 1];
            promise.resolveOrReject(parentPromise);
        }
        this.promiseStackPos = 0;
        this.promiseRunnerInWork = false;
    }

    protected value: Opt<T> = null;
    protected state = FastPromiseState.PENDING;
    protected children: Opt<FastPromise<any>[]> = null;
    protected thisArg: FastPromiseThis;
    protected arg: any;

    protected onFulfill: FastPromiseCallback<any, T, any>;
    protected onReject: FastPromiseCallback<any, T, any>;
    protected onCancelCallback: Opt<() => void>;

    constructor(executor?: (resolve: (val?: T | FastPromise<T>) => void, reject: (err?: T | Error) => void) => void) {
        if (executor) {
            this.callExecutor(executor);
        }
    }

    protected callExecutor(executor: (resolve: (val?: T | FastPromise<T>) => void, reject: (err?: T | Error) => void) => void) {
        executor(val => this.resolve(val), err => this.reject(err!))
    }

    resolve(value?: T | FastPromise<T>) {
        if (this.state !== FastPromiseState.PENDING) {
            return this;
        }
        let newValue: any;
        if (this.onFulfill) {
            newValue = this.onFulfill.call(this.thisArg, value, this.arg);
        } else {
            newValue = value;
        }
        if (this.valueIsPromise(newValue)) {
            this.valueAsPromise(newValue);
            return this;
        }
        this.resolveWithoutCallback(newValue as T);
        return this;
    }

    protected otherThen(promise: PromiseLike<any>) {
        promise.then(val => this.resolveWithoutCallback(val), err => this.rejectWithoutCallback(err));
    }

    protected resolveWithoutCallback(value: T) {
        if (this.state !== FastPromiseState.CANCELLED) {
            this.value = value;
            this.state = FastPromiseState.RESOLVED;
            FastPromise.addPromiseChildrenToStack(this);
        }
    }

    protected rejectWithoutCallback(value: T, setResolved?: boolean) {
        if (this.state !== FastPromiseState.CANCELLED) {
            this.value = value;
            this.state = setResolved ? FastPromiseState.RESOLVED : FastPromiseState.REJECTED;
            if (this.children) {
                FastPromise.addPromiseChildrenToStack(this);
            } else {
                this.throwUnhandledRejection();
            }
        }
    }

    protected throwUnhandledRejection() {
        const unhandledRejection = FastPromise.unhandledRejection;
        setTimeout(() => {
            if (!this.children && this.state === FastPromiseState.REJECTED) {
                if (unhandledRejection) {
                    unhandledRejection(this.value);
                } else {
                    if (this.value instanceof Error) {
                        throw this.value;
                    } else {
                        throw new Error("Uncaught in promise with error: " + JSON.stringify(this.value));
                    }
                }
            }
        });
    }

    reject(reason: T | Error) {
        if (this.state !== FastPromiseState.PENDING) {
            return this;
        }
        let newValue: any;
        if (this.onReject) {
            newValue = this.onReject.call(this.thisArg, reason, this.arg);
        } else {
            newValue = reason;
        }

        if (this.valueIsPromise(newValue)) {
            this.valueAsPromise(newValue);
            return this;
        }
        this.rejectWithoutCallback(newValue as T, !!this.onReject);
        return this;
    }

    isResolved() {
        return this.state == FastPromiseState.RESOLVED;
    }

    isRejected() {
        return this.state == FastPromiseState.REJECTED;
    }

    isCancelled() {
        return this.state == FastPromiseState.CANCELLED;
    }

    isPending() {
        return this.state == FastPromiseState.PENDING;
    }

    cancel() {
        this.state = FastPromiseState.CANCELLED;
        if (this.onCancelCallback) {
            this.onCancelCallback();
        }
        if (this.children) {
            for (let i = 0; i < this.children.length; i++) {
                const child = this.children[i];
                child.cancel();
            }
        }
    }

    onCancel(callback: Opt<() => void>) {
        this.onCancelCallback = callback;
    }

    protected valueIsPromise(value: any) {
        return typeof value === 'object' && value !== null && typeof value.then === 'function';
    }

    protected valueAsPromise(value: FastPromise<any>) {
        if (value.then === FastPromise.prototype.then) {
            value.then(this.resolveWithoutCallback, this.rejectWithoutCallback, this);
        } else {
            this.otherThen(value);
        }
    }

    protected resolveOrReject(parentPromise: FastPromise<any>) {
        if (parentPromise.state == FastPromiseState.CANCELLED) {
            this.cancel();
            return;
        }
        const value = parentPromise.value;
        if (parentPromise.state == FastPromiseState.REJECTED) {
            this.reject(value as T);
            return;
        }
        if (this.valueIsPromise(value)) {
            this.valueAsPromise(value);
            return this;
        }
        this.resolve(value as T);
    }

    then<TResult1, TResult2>(onfulfilled: (value: T) => TResult1 | PromiseLike<TResult1>, onrejected: (reason: any) => TResult2 | PromiseLike<TResult2>): FastPromise<TResult1 | TResult2>;
    then<TResult>(onfulfilled: (value: T) => TResult | PromiseLike<TResult>, onrejected: (reason: any) => TResult | PromiseLike<TResult>): FastPromise<TResult>;
    then<TResult>(onfulfilled: (value: T) => TResult | PromiseLike<TResult>): FastPromise<TResult>;
    then<R, Arg>(onFulfill?: FastPromiseCallback<R, T, Arg>, onReject?: FastPromiseCallback<R, T, Arg>, thisArg?: FastPromiseThis, arg?: Arg): FastPromise<R>;
    then(): FastPromise<T>;
    then<R, Arg>(onFulfill?: FastPromiseCallback<R, T, Arg>, onReject?: FastPromiseCallback<R, T, Arg>, thisArg?: FastPromiseThis, arg?: Arg): FastPromise<R> {
        const p = new FastPromise<R>();
        p.onFulfill = onFulfill as FastPromiseCallback<T, R, Arg>;
        p.onReject = onReject as FastPromiseCallback<T, R, Arg>;
        p.thisArg = thisArg;
        p.arg = arg;
        if (!this.children) {
            this.children = [];
        }
        if (this.state !== FastPromiseState.PENDING) {
            this.children = [];
            this.children.push(p);
            FastPromise.addPromiseChildrenToStack(this);
        }
        this.children.push(p);

        return p;
    }

    catch(onrejected: (reason: any) => T | PromiseLike<T>): FastPromise<T>;
    catch<R, Arg>(onReject: FastPromiseCallback<R, T, Arg>, thisArg?: FastPromiseThis, arg?: Arg): FastPromise<R> {
        return this.then(null, onReject, thisArg, arg);
    }

    static resolve<R>(value?: R): FastPromise<R> {
        return new FastPromise<R>().resolve(value!);
    }

    static reject<R>(reason: R): FastPromise<R> {
        return new FastPromise<R>().reject(reason);
    }

    private static allResolve(val: any, ctx: PAllContext) {
        ctx.allCtx.arr[ctx.i] = val;
        if (--ctx.allCtx.counter == 0) {
            ctx.allCtx.promise.resolve(ctx.allCtx.arr);
        }
    }

    private static allReject(val: any, ctx: PAllContext) {
        ctx.allCtx.promise.reject(val);
    }

    static all<TAll>(array: (TAll | FastPromise<TAll>)[]) {
        const promise = new FastPromise<any>();
        const arr = new Array(array.length);
        const allCtx = {counter: 0, promise, arr};
        for (let i = 0; i < array.length; i++) {
            const val = array[i];
            if (val instanceof FastPromise) {
                allCtx.counter++;
                const ctx: PAllContext = {allCtx, i};
                val.then(FastPromise.allResolve, FastPromise.allReject, null, ctx);
            } else {
                arr[i] = val;
            }
        }
        if (!array.length) {
            promise.resolve([]);
        }
        return promise;
    }

    /*    static map(array: any[], iterator: (val: any)=>P<any>, initialValue: any, thisArg?: This) {
     let promise = P.resolve(initialValue);
     for (let i = 0; i < array.length; i++) {
     promise = promise.then(iterator, null, thisArg, array[i]);
     }
     return promise;
     }*/

    static race<TAll>(array: (TAll | FastPromise<TAll>)[]) {
        const promise = new FastPromise<Opt<TAll>>();
        for (let i = 0; i < array.length; i++) {
            const item = array[i];
            if (item instanceof FastPromise) {
                item.then(promise.resolve, promise.reject, promise);
            } else {
                promise.resolve(item);
                break;
            }
        }
        if (array.length == 0) {
            promise.resolve(null);
        }
        return promise;
    }

    private static unhandledRejection: Opt<(reason: any) => void> = null;

    static onUnhandledRejection(fn: Opt<(reason: any) => void>) {
        FastPromise.unhandledRejection = fn;
    }
}
// to fast check nonexistent props
const proto = FastPromise.prototype as any;
proto.onFulfill = null;
proto.onReject = null;
proto.onCancelCallback = null;

interface PAllContext {
    allCtx: {arr: {}[]; promise: FastPromise<any>; counter: number};
    i: number
}


// tests
import './Promise.spec';
