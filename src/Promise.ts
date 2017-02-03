export type Opt<T> = T | undefined | void | null;

export type FastPromiseThis = Object | undefined | null;
export type FastPromiseCallback<R, T, Arg> = Opt<(val: T, arg?: Arg) => Opt<R | FastPromise<R>>>;

export const enum FastPromiseState{
    PENDING,
    RESOLVED,
    REJECTED,
    CANCELLED,
}


// test in browser
declare const exports: any;
if (typeof exports === 'undefined') {
    (window as any).module = {exports: {}};
    (window as any).exports = {};
}


export default class FastPromise<T> {
    static readonly [Symbol.species]: Function;
    readonly [Symbol.toStringTag]: 'Promise';

    protected static promiseStack: FastPromise<any>[] = [];
    protected static promiseStackPos = 0;
    protected static promiseRunnerInWork = false;

    protected addToStack() {

        let ps = FastPromise.promiseStack;
        let pos = FastPromise.promiseStackPos;
        if (this.firstChild) {
            ps[pos] = this;
            ps[pos + 1] = this.firstChild;
            pos += 2;
            // this.firstChild = void 0;
            FastPromise.promiseStackPos = pos;
            if (!FastPromise.promiseRunnerInWork) {
                FastPromise.promiseRunner();
            }
        }
        if (this.children) {
            this.addToStackChildren();
        }
    }

    addToStackChildren() {
        let ps = FastPromise.promiseStack;
        let pos = FastPromise.promiseStackPos;
        let ch = this.children;
        for (let i = 0; i < ch.length; i++) {
            const childPromise = ch[i];
            ps[pos] = this;
            ps[pos + 1] = childPromise;
            pos += 2;
        }
        // this.children = null;
        FastPromise.promiseStackPos = pos;
        if (!FastPromise.promiseRunnerInWork) {
            FastPromise.promiseRunner();
        }
    }

    protected static promiseRunner() {
        FastPromise.promiseRunnerInWork = true;
        let promiseStack = FastPromise.promiseStack;
        for (let i = 0; i < FastPromise.promiseStackPos; i += 2) {
            const parentPromise = promiseStack[i];
            const promise = promiseStack[i + 1];
            promise.process(parentPromise);
        }
        FastPromise.promiseStackPos = 0;
        FastPromise.promiseRunnerInWork = false;
        //comment to disable inlining
        //comment to disable inlining
        //comment to disable inlining
        //comment to disable inlining
        //comment to disable inlining
        //comment to disable inlining
        //comment to disable inlining
        //comment to disable inlining
        //comment to disable inlining
        //comment to disable inlining
        //comment to disable inlining
        //comment to disable inlining
        //comment to disable inlining
        //comment to disable inlining
        //comment to disable inlining
        //comment to disable inlining
        //comment to disable inlining
        //comment to disable inlining
        //comment to disable inlining
        //comment to disable inlining
        //comment to disable inlining
        //comment to disable inlining
        //comment to disable inlining
        //comment to disable inlining
        //comment to disable inlining
        //comment to disable inlining
        //comment to disable inlining
        //comment to disable inlining
        //comment to disable inlining
    }

    protected value: Opt<T> = void 0;
    protected state = FastPromiseState.PENDING;
    protected firstChild: FastPromise<any> = void 0;
    protected children: FastPromise<any>[] = void 0;
    protected thisArg: FastPromiseThis = void 0;
    protected skipProcess = false;

    protected onFulfill: FastPromiseCallback<any, T, any> = void 0;
    protected onReject: FastPromiseCallback<any, T, any> = void 0;
    protected onCancelCallback: Opt<() => void> = void 0;

    constructor(executor?: (resolve: (val?: T | FastPromise<T>) => void, reject: (err?: T | Error) => void) => void) {
        if (executor) {
            executor(this.resolve.bind(this), this.reject.bind(this));
        }
    }

    resolve(value?: T | FastPromise<T>) {
        if (this.state !== FastPromiseState.PENDING) {
            return this;
        }
        let v;
        try {
            v = this.fullfill(value);
        } catch (e) {
            this._reject(e);
            return this;
        }
        if (typeof v === 'object' && v !== null && typeof v.then === 'function') {
            if (v.then === FastPromise.prototype.then) {
                v.innerThen(this);
            } else {
                v.then(this._resolve.bind(this), this._reject.bind(this));
            }
        } else {
            this._resolve(v as T);
        }
        return this;
    }

    protected fullfill(value: any) {
        let newValue: any;
        if (!this.skipProcess && this.onFulfill) {
            newValue = this.onFulfill.call(this.thisArg, value);
        } else {
            newValue = value;
        }
        return newValue;
    }

    protected innerThen(childPromise: FastPromise<any>) {
        childPromise.skipProcess = true;
        if (this.state !== FastPromiseState.PENDING) {
            this.firstChild = childPromise;
            this.addToStack();
            return;
        }
        if (this.firstChild) {
            if (!this.children) {
                this.children = [];
            }
            this.children.push(childPromise);
        } else {
            this.firstChild = childPromise;
        }
    }

    protected _resolve(value: T) {
        if (this.state !== FastPromiseState.CANCELLED) {
            this.value = value;
            this.state = FastPromiseState.RESOLVED;
            this.addToStack();
        }
    }

    protected _reject(value: T, setResolved?: boolean) {
        if (this.state !== FastPromiseState.CANCELLED) {
            this.value = value;
            this.state = setResolved ? FastPromiseState.RESOLVED : FastPromiseState.REJECTED;
            if (this.children === void 0 && this.firstChild === void 0 && this.state === FastPromiseState.REJECTED) {
                FastPromise.throwUnhandledRejection(this);
            }
            this.addToStack();
        }
    }

    protected static timeoutSended = false;
    protected static unhandledPromisesList: FastPromise<any>[] = [];
    protected static unhandledPromisesLen = 0;

    protected static throwUnhandledRejectionCallback() {
        for (let i = 0; i < FastPromise.unhandledPromisesLen; i++) {
            const promise = FastPromise.unhandledPromisesList[i];
            if (promise.children === void 0 && promise.firstChild === void 0 && promise.state === FastPromiseState.REJECTED) {
                if (FastPromise.unhandledRejection) {
                    FastPromise.unhandledRejection(promise.value);
                } else {
                    if (promise.value instanceof Error) {
                        throw promise.value;
                    } else {
                        throw new Error('Uncaught in promise with error: ' + JSON.stringify(promise.value));
                    }
                }
            }
            FastPromise.unhandledPromisesList[i] = null;
        }
        for (let i = FastPromise.unhandledPromisesLen; i < FastPromise.unhandledPromisesList.length; i++) {
            FastPromise.unhandledPromisesList[i] = null;
        }
        FastPromise.unhandledPromisesLen = 0;
        FastPromise.timeoutSended = false;
    }

    protected static throwUnhandledRejection(promise: FastPromise<any>) {
        FastPromise.unhandledPromisesList[FastPromise.unhandledPromisesLen++] = promise;
        if (!FastPromise.timeoutSended) {
            setTimeout(FastPromise.throwUnhandledRejectionCallback);
            FastPromise.timeoutSended = true;
        }
    }

    reject(reason: T | Error) {
        if (this.state !== FastPromiseState.PENDING) {
            return this;
        }
        let v;
        try {
            v = this.callReject(reason);
        } catch (e) {
            this._reject(e);
            return this;
        }
        if (typeof v === 'object' && v !== null && typeof v.then === 'function') {
            if (v.then === FastPromise.prototype.then) {
                v.innerThen(this);
            } else {
                v.then(this._resolve.bind(this), this._reject.bind(this));
            }
            return this;
        }
        this._reject(v as T, !!this.onReject && !this.skipProcess);
        return this;
    }

    callReject(reason: any) {
        let v: any;
        if (!this.skipProcess && this.onReject) {
            v = this.onReject.call(this.thisArg, reason);
        } else {
            v = reason;
        }
        return v;
    }

    isResolved() {
        return this.state === FastPromiseState.RESOLVED;
    }

    isRejected() {
        return this.state === FastPromiseState.REJECTED;
    }

    isCancelled() {
        return this.state === FastPromiseState.CANCELLED;
    }

    isPending() {
        return this.state === FastPromiseState.PENDING;
    }

    cancel() {
        //todo: use stack
        this.state = FastPromiseState.CANCELLED;
        if (this.onCancelCallback) {
            this.onCancelCallback();
        }
        if (this.firstChild) {
            this.firstChild.cancel();
            // this.firstChild = null;
        }
        if (this.children) {
            for (let i = 0; i < this.children.length; i++) {
                const child = this.children[i];
                child.cancel();
            }
            // this.children = null;
        }
    }

    onCancel(callback: Opt<() => void>) {
        this.onCancelCallback = callback;
    }

    protected process(parent: FastPromise<any>) {
        if (parent.state === FastPromiseState.CANCELLED) {
            this.cancel();
            return;
        }
        const v = parent.value;
        if (typeof v === 'object' && v !== null && typeof v.then === 'function') {
            if (v.then === FastPromise.prototype.then) {
                v.innerThen(this);
            } else {
                v.then(this._resolve.bind(this), this._reject.bind(this));
            }
            return this;
        }
        if (parent.state === FastPromiseState.REJECTED) {
            this.reject(v as T);
        } else {
            this.resolve(v as T);
        }
    }

    then<TResult1, TResult2>(onfulfilled: (value: T) => TResult1 | PromiseLike<TResult1>, onrejected: (reason: any) => TResult2 | PromiseLike<TResult2>): FastPromise<TResult1 | TResult2>;
    then<TResult>(onfulfilled: (value: T) => TResult | PromiseLike<TResult>, onrejected: (reason: any) => TResult | PromiseLike<TResult>): FastPromise<TResult>;
    then<TResult>(onfulfilled: (value: T) => TResult | PromiseLike<TResult>): FastPromise<TResult>;
    then<R, Arg>(onFulfill?: FastPromiseCallback<R, T, Arg>, onReject?: FastPromiseCallback<R, T, Arg>, thisArg?: FastPromiseThis): FastPromise<R>;
    then(): FastPromise<T>;
    then<R, Arg>(onFulfill?: FastPromiseCallback<R, T, Arg>, onReject?: FastPromiseCallback<R, T, Arg>, thisArg?: FastPromiseThis): FastPromise<R> {
        const p = new FastPromise<R>();
        p.onFulfill = onFulfill as FastPromiseCallback<T, R, Arg>;
        p.onReject = onReject as FastPromiseCallback<T, R, Arg>;
        p.thisArg = thisArg;
        if (this.state !== FastPromiseState.PENDING) {
            this.firstChild = p;
            this.addToStack();
            return p;
        }
        if (this.firstChild) {
            if (!this.children) {
                this.children = [];
            }
            this.children.push(p);
        } else {
            this.firstChild = p;
        }

        return p;
    }

    catch(onrejected: (reason: any) => T | PromiseLike<T>): FastPromise<T>;
    catch<R, Arg>(onReject: FastPromiseCallback<R, T, Arg>, thisArg?: FastPromiseThis): FastPromise<R> {
        return this.then(null, onReject, thisArg);
    }

    static resolve<R>(value?: R): FastPromise<R> {
        return new FastPromise<R>().resolve(value!);
    }

    static reject<R>(reason: R): FastPromise<R> {
        return new FastPromise<R>().reject(reason);
    }

    private static allResolve(this: PAllContext, val: any) {
        this.allCtx.arr[this.i] = val;
        if (--this.allCtx.counter === 0) {
            this.allCtx.promise.resolve(this.allCtx.arr);
        }
    }

    private static allReject(this: PAllContext, val: any) {
        this.allCtx.promise.reject(val);
    }

    static all<TAll>(array: (TAll | FastPromise<TAll>)[]) {
        const promise = new FastPromise<any>();
        const arr = new Array(array.length);
        const allCtx = {counter: 0, promise, arr};
        const promises: FastPromise<any>[] = new Array(arr.length);
        for (let i = 0; i < array.length; i++) {
            const value = array[i];
            if (typeof value === 'object' && value !== null && (value as FastPromise<{}>).then === FastPromise.prototype.then) {
                allCtx.counter++;
                promises[i] = value as FastPromise<any>;
            } else {
                promises[i] = null;
                arr[i] = value;
            }
        }
        for (let i = 0; i < array.length; i++) {
            if (promises[i]) {
                (array[i] as FastPromise<{}>).then(FastPromise.allResolve, FastPromise.allReject, {allCtx, i});
            }
        }

        if (!array.length) {
            promise.resolve([]);
        }
        return promise;
    }

    static race<TAll>(array: (TAll | FastPromise<TAll>)[]) {
        const promise = new FastPromise<TAll>();
        for (let i = 0; i < array.length; i++) {
            const value = array[i];
            if (typeof value === 'object' && value !== null && (value as FastPromise<{}>).then === FastPromise.prototype.then) {
                (value as FastPromise<{}>).then(promise.resolve, promise.reject, promise);
            } else {
                promise.resolve(value);
                break;
            }
        }
        if (array.length === 0) {
            promise.resolve(null);
        }
        return promise;
    }

    private static unhandledRejection: Opt<(reason: any) => void> = null;

    static onUnhandledRejection(fn: Opt<(reason: any) => void>) {
        FastPromise.unhandledRejection = fn;
    }
};

interface PAllContext {
    allCtx: { arr: {}[]; promise: FastPromise<any>; counter: number };
    i: number
}

// import './Promise.spec';