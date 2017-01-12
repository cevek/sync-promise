import FastPromise from "./Promise";
type Opt<T> = T | undefined | void | null;

function check(fn: ()=>void, val: any, expected: any) {
    for (let i = 0; i < Math.max(val.length, expected.length); i++) {
        if (val[i] !== expected[i]) {
            console.error(`Test failed at array pos ${i}, expected: ${JSON.stringify(expected)}, given: ${JSON.stringify(val)} on ${(fn as any).name}`);
        }
    }
}

function test1() {
    const calls: number[] = [];
    const p = new FastPromise<number>();
    p.then(val => calls.push(val));

    p.resolve(1);
    check(test1, calls, [1]);
}

function test2() {
    const calls: number[] = [];
    const p = new FastPromise<number>();
    p.then(val => calls.push(val)).catch(() => null);
    p.reject(1);
    check(test2, calls, []);
}


function test3() {
    const calls: number[] = [];
    const p = new FastPromise<number>();
    p.catch(val => 2)
        .then(val => calls.push(val));

    p.reject(1);
    check(test3, calls, [2]);
}

function test4() {
    const calls: number[] = [];
    const p = new FastPromise<number>();
    p.then(() => 2)
        .catch(val => 3)
        .then(val => calls.push(val));

    p.reject(1);
    check(test4, calls, [3]);
}

function test5() {
    const calls: number[] = [];
    const p = new FastPromise<number>();
    p.then(val => new FastPromise<number>().resolve(val + 2))
        .catch(val => 30)
        .then(val => calls.push(val));

    p.resolve(1);
    check(test5, calls, [3]);
}

function test6() {
    const calls: number[] = [];
    const p = new FastPromise<number>();
    p
        .then(val => new FastPromise<number>().reject(val + 10))
        .catch((val: number) => {
            calls.push(val);
            return 7
        })
        .then(val => calls.push(val));

    p.resolve(1);
    check(test6, calls, [11, 7]);
}

function test7() {
    const calls: number[] = [];
    const p = new FastPromise<number>();
    p.then(val => calls.push(val));
    p.then(val => {
        calls.push(val + 1);
        return val + 1
    })
        .then(val => calls.push(val));

    p.resolve(1);
    check(test7, calls, [1, 2, 2]);
}

function test8() {
    const calls: number[] = [];
    const p = new FastPromise<number>();
    const pp = p.then(val => {
        const r = new FastPromise<number>().resolve(val + 1);
        r.catch(a => calls.push(a + 100));
        r.then(a => calls.push(a + 1));
        return r;
    });
    pp.then(val => calls.push(val + 5));
    pp.then(val => {
        calls.push(val + 2);
        return val + 1
    })
        .then(val => calls.push(val));

    p.resolve(1);
    check(test8, calls, [3, 7, 4, 3]);
}

function test9() {
    const calls: number[] = [];
    const p = new FastPromise<number>();
    p.then(val => {
        const r = new FastPromise<number>();
        const rr = r.then(val => new FastPromise<number>().resolve(val + 1));
        r.resolve(val + 1);
        return rr;
    }).then(val => calls.push(val));
    p.resolve(1);
    check(test9, calls, [3]);
}

function test10() {
    const calls: number[] = [];
    const p = new FastPromise<number>();
    let pp = new FastPromise<number>();
    p
        .then(val => pp)
        .then(val => calls.push(val));

    p.resolve(1);
    pp.resolve(5);
    check(test10, calls, [5]);
}

function test11() {
    const calls: number[] = [];
    const p = new FastPromise<number>();
    p.resolve(1);
    p.then(val => calls.push(val));
    p.then(val => calls.push(val));
    check(test11, calls, [1, 1]);
}

function test12() {
    const calls: number[] = [];
    const p = new FastPromise<number>();
    let pp = new FastPromise<number>();
    p
        .then(val => pp)
        .then(val => calls.push(val)).catch(val => calls.push(val + 1));

    p.resolve(1);
    pp.reject(5);
    check(test12, calls, [6]);
}

function test13() {
    const calls: number[] = [];
    const p = new FastPromise<number>();
    let pp = new FastPromise<number>();
    let ppp = new FastPromise<number>();
    p
        .then(val => pp)
        .then(val => calls.push(val));

    p.resolve(1);
    pp.resolve(ppp);
    ppp.resolve(5);
    check(test13, calls, [5]);
}
function sleeFastPromise(ms: number, val?: number) {
    const p = new FastPromise<number>();
    setTimeout(() => p.resolve(val!), ms);
    return p;
}

function test14() {
    FastPromise.all([
        sleeFastPromise(10).then(() => 0),
        FastPromise.resolve(1),
        FastPromise.resolve(2),
        3,
        sleeFastPromise(20).then(() => 4),
    ]).then(arr => {
        check(test14, arr, [0, 1, 2, 3, 4]);
    });
}
function test15() {

    FastPromise.race([
        sleeFastPromise(10).then(() => 0),
        FastPromise.resolve(1),
        FastPromise.resolve(2),
        3,
    ]).then(val => {
        check(test15, [val], [1]);
    });
}
function test16() {
    /*
     const calls: number[] = [];
     FastPromise.maFastPromise([
     () => sleeFastPromise(10).then(() => {
     calls.push(0);
     }),
     () => FastPromise.resolve(1).then(val => calls.push(1)),
     () => sleeFastPromise(20).then(() => {
     calls.push(2);
     }),
     () => FastPromise.resolve(3).then(val => calls.push(3))
     ]).then(() => {
     check(calls, [0, 1, 2, 3])
     })
     */
}

function test17() {
    const calls: number[] = [];
    FastPromise.resolve(1)
        .then(v => {
            calls.push(v);
            return sleeFastPromise(20, 11)
        })
        .then(v => {
            calls.push(v);
            return sleeFastPromise(10, 21)
        })
        .then(v => {
            calls.push(v);
            check(test17, calls, [1, 11, 21])
        })
}

function test18() {
    FastPromise.all([
        sleeFastPromise(10).then(() => 0),
        FastPromise.resolve(1),
        FastPromise.reject(2),
        3,
        sleeFastPromise(20).then(() => 4),
    ]).then(arr => {
        check(test18, arr, []);
    }).catch(val => {
        check(test18, [val], 2);
    })
}

function test19() {
    FastPromise.race([
        sleeFastPromise(10).then(() => 0),
        FastPromise.resolve(1),
        FastPromise.reject(2),
        3,
        sleeFastPromise(20).then(() => 4),
    ]).then(arr => {
        check(test19, arr, []);
    }).catch(val => {
        check(test19, [val], 2);
    })
}

function test20() {
    const calls: number[] = [];
    const p = new FastPromise<number>();
    p.then(val => calls.push(val));
    p.then(val => calls.push(val)).then(val => calls.push(val));
    p.cancel();
    p.then(val => calls.push(val)).then(val => calls.push(val));
    p.resolve(1);
    check(test20, calls, []);
}

function test21() {
    const calls: number[] = [];
    const p = new FastPromise<number>();
    p.then(val => calls.push(val));
    const pp = p.then(val => calls.push(val + 1));
    pp.then(val => calls.push(val + 2));
    pp.cancel();
    pp.then(val => calls.push(val)).then(val => calls.push(val));
    p.resolve(1);
    check(test21, calls, [1]);
}

function test22() {
    const calls: number[] = [];
    const p = new FastPromise<number>();
    p.then(val => sleeFastPromise(10, 10).then(val => calls.push(val)));
    p.cancel();
    p.resolve(1);
    check(test22, calls, []);
}

function test23() {
    const calls: number[] = [];
    const p = new FastPromise<number>();
    let pp: Opt<FastPromise<number>> = undefined;
    p.then(val => pp = sleeFastPromise(10, 10).then(val => {
        calls.push(val);
        return 20
    }));
    p.resolve(1);
    p.cancel();
    if (pp) {
        pp.then(val => {
            calls.push(val);
            check(test23, calls, [10, 20])
        });
    }
}
function test24() {
    const calls: number[] = [];
    const p = new FastPromise<number>();
    const pp = p.then(a => a);
    pp.then(a => calls.push(a));
    pp.resolve(1);
    p.resolve(2);
    check(test24, calls, [1]);
}
function test25() {
    const calls: number[] = [];
    FastPromise.onUnhandledRejection(val => {calls.push(val)});
    FastPromise.reject(2);
    setTimeout(() => {
        check(test25, calls, [2]);
        FastPromise.onUnhandledRejection(null);
    }, 20);
}
function test26() {
    const calls: number[] = [];
    const errCalls: number[] = [];
    const p = FastPromise.reject(1);
    p
        .then(val => val, err => FastPromise.reject(2))
        .then(val => calls.push(val), err => errCalls.push(err))
    check(test26, calls, []);
    check(test26, errCalls, [2]);
    p.then(null, err => err);
}
function test27() {
    const calls: number[] = [];
    const p1 = FastPromise.resolve(1);
    const p2 = FastPromise.resolve(2);
    const p3 = new FastPromise();
    FastPromise.all([0, p1, p2, p3, 4]).then((val) => {
        calls.push(...val);
    });
    p3.resolve(3);
    check(test27, calls, [0, 1, 2, 3, 4]);
}


test1();
test2();
test3();
test4();
test5();
test6();
test7();
test8();
test9();
test10();
test11();
test12();
test13();
test14();
test15();
test16();
test17();
test18();
test19();
test20();
test21();
test22();
test23();
test24();
test25();
test26();
test27();
