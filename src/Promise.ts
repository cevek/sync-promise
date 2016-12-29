// namespace F {
    export type Opt<T> = T | undefined | void | null;

    export type FastPromiseThis = Object | undefined | null;
    export type FastPromiseCallback<R, T, Arg> = Opt<(val: T, arg?: Arg) => Opt<R | FastPromise<R>>>;

    export const enum FastPromiseState{
        PENDING,
        RESOLVED,
        REJECTED,
        CANCELLED
    }

    interface SD extends Array<any>{
        len: number;
    }
    const cache:SD[] = [];
    let cachePos = 0;

    function createCache() {
        const x = [] as SD;
        x.len = 0;
        return x;
    }
    function getChildren() {
        return cachePos > 0 ? cache[--cachePos] : createCache();
    }
    function restoreCache(item: SD) {
        item.len = 0;
        return cache[cachePos++] = item;
    }


    export default class FastPromise<T> {
        static readonly [Symbol.species]: Function;
        readonly [Symbol.toStringTag]: "Promise";

        protected static promiseStack: FastPromise<any>[] = [];
        protected static promiseStackPos = 0;
        protected static promiseRunnerInWork = false;

        protected addToStack() {
            let ps = FastPromise.promiseStack;
            let ch = this.children;
            let pos = FastPromise.promiseStackPos;
            if (this.child) {
                ps[pos] = this;
                ps[pos + 1] = this.child;
                pos += 2;
            } else if (ch) {
                for (let i = 0; i < ch.length; i++) {
                    const childPromise = ch[i];
                    ps[pos] = this;
                    ps[pos + 1] = childPromise;
                    pos += 2;
                }
            }
            FastPromise.x(pos);
        }

        static x(pos: number) {
            FastPromise.promiseStackPos = pos;
            if (!FastPromise.promiseRunnerInWork) {
                FastPromise.promiseRunner();
            }
        }

        protected static promiseRunner() {
            if (FastPromise.promiseRunnerInWork) {
                return;
            }
            FastPromise.promiseRunnerInWork = true;
            let promiseStack = FastPromise.promiseStack;
            for (let i = 0; i < FastPromise.promiseStackPos; i += 2) {
                const parentPromise = promiseStack[i];
                const promise = promiseStack[i + 1];
                promise.resolveOrReject(parentPromise);
            }
            this.promiseStackPos = 0;
            this.promiseRunnerInWork = false;
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

        protected value: Opt<T> = null;
        protected state = FastPromiseState.PENDING;
        protected child: Opt<FastPromise<any>> = null;
        protected children: Opt<FastPromise<any>[]> = null;
        // protected children: Opt<SD> = getChildren();
        protected thisArg: FastPromiseThis;
        protected arg: any;
        protected doNext: boolean = false;

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
            let newValue = this.fullfill(value);
            if (this.valueIsPromise(newValue)) {
                if (newValue.then === FastPromise.prototype.then) {
                    newValue.innerThen(this);
                } else {
                    this.otherThen(newValue);
                }
                return this;
            }
            this.resolveWithoutCallback(newValue as T);
            return this;
        }

        fullfill(value: any) {
            let newValue: any;
            if (this.onFulfill) {
                newValue = this.onFulfill.call(this.thisArg, value, this.arg);
            } else {
                newValue = value;
            }
            return newValue;
        }

        protected valueAsPromise(newValue: FastPromise<any>) {
            if (newValue.then === FastPromise.prototype.then) {
                newValue.innerThen(this);
            } else {
                this.otherThen(newValue);
            }
        }

        protected innerThen(childPromise: FastPromise<any>) {
            childPromise.doNext = true;
            if (this.state !== FastPromiseState.PENDING) {
                this.children = null;
                this.child = childPromise;
                this.addToStack();
                return;
            }
            if (this.child) {
                if (!this.children) {
                    this.children = [];
                }
                this.children.push(this.child, childPromise);
                this.child = null;
            } else {
                this.child = childPromise;
            }
        }

        protected otherThen(promise: PromiseLike<any>) {
            promise.then(val => this.resolveWithoutCallback(val), err => this.rejectWithoutCallback(err));
        }

        protected resolveWithoutCallback(value: T) {
            if (this.state !== FastPromiseState.CANCELLED) {
                this.value = value;
                this.state = FastPromiseState.RESOLVED;
                this.addToStack();
            }
        }

        protected resolveWithoutCallbackBinded() {
            return (val: any) => this.resolveWithoutCallback(val);
        }

        protected rejectWithoutCallbackBinded() {
            return (val: any) => this.rejectWithoutCallback(val);
        }

        protected rejectWithoutCallback(value: T, setResolved?: boolean) {
            if (this.state !== FastPromiseState.CANCELLED) {
                this.value = value;
                this.state = setResolved ? FastPromiseState.RESOLVED : FastPromiseState.REJECTED;
                this.addToStack();
                if (!this.children && !this.child && this.state === FastPromiseState.REJECTED) {
                    this.throwUnhandledRejection();
                }
            }
        }

        protected throwUnhandledRejection() {
            const unhandledRejection = FastPromise.unhandledRejection;
            setTimeout(() => {
                if (!this.children && !this.child && this.state === FastPromiseState.REJECTED) {
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
                if (newValue.then === FastPromise.prototype.then) {
                    newValue.innerThen(this);
                } else {
                    this.otherThen(newValue);
                }
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
            //todo: use stack
            this.state = FastPromiseState.CANCELLED;
            if (this.onCancelCallback) {
                this.onCancelCallback();
            }
            if (this.child) {
                this.child.cancel();
            } else if (this.children) {
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

        protected resolveOrReject(parent: FastPromise<any>) {
            if (parent.state === FastPromiseState.CANCELLED) {
                this.cancel();
                return;
            }
            const value = parent.value;
            if (this.valueIsPromise(value)) {
                if (value.then === FastPromise.prototype.then) {
                    value.innerThen(this);
                } else {
                    this.otherThen(value);
                }
                return this;
            }

            this.doNextXX(parent, value);

            if (parent.state === FastPromiseState.REJECTED) {
                this.reject(value as T);
                return;
            }
            this.resolve(value as T);
        }

        doNextXX(parent: FastPromise<any>, value: any) {
            if (this.doNext) {
                if (parent.state === FastPromiseState.REJECTED) {
                    this.rejectWithoutCallback(value as T);
                    return;
                }
                this.resolveWithoutCallback(value as T);
                return;
            }
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
            if (this.state !== FastPromiseState.PENDING) {
                this.children = null;
                this.child = p;
                this.addToStack();
                return p;
            }
            if (this.child) {
                if (!this.children) {
                    this.children = [];
                }
                this.children.push(this.child, p);
                this.child = null;
            } else {
                this.child = p;
            }

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
                const value = array[i];
                if (typeof value === 'object' && value !== null && value.then === FastPromise.prototype.then) {
                    allCtx.counter++;
                    const ctx: PAllContext = {allCtx, i};
                    value.then(FastPromise.allResolve, FastPromise.allReject, null, ctx);
                } else {
                    arr[i] = value;
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
//
    if (!console.profile) {
        console.profile = function () {}
        console.profileEnd = function () {}
    }

    const blobIdP = FastPromise.resolve(true);
    const fileP = FastPromise.resolve(true);
    const createQuery = () => FastPromise.resolve(true);
    const insert = () => FastPromise.resolve(true);
    const whereUpdate = () => FastPromise.resolve(true);

    console.profile('perf');
    console.time('perf');
    for (let i = 0; i < 100000; i++) {
        abc();
    }
    console.timeEnd('perf');
    console.profileEnd('perf');

    function abc() {
        FastPromise.all([blobIdP, fileP]).then(function (result) {
            const blobId = result[0];
            const fileV = result[1];
        }).then(function () {
            return createQuery().then(function () {}).then(function () {});
        }).then(function () {
            return insert();
        }).then(function () {
            return whereUpdate();
        }).then(function () {
        }, function (err) {
        });
    }
// }

// tests
import './Promise.spec';
