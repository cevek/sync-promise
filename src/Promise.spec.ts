import {FastPromise} from "./Promise";
type Opt<T> = T | undefined | void | null;

function check(val: any, expected: any) {
    for (let i = 0; i < Math.max(val.length, expected.length); i++) {
        if (val[i] !== expected[i]) {
            console.error('Test failed', i, val, expected, val[i], expected[i]);
        }
    }
}

function test1() {
    const calls: number[] = [];
    const p = new FastPromise<number>();
    p.then(val => calls.push(val));

    p.resolve(1);
    check(calls, [1]);
}

function test2() {
    const calls: number[] = [];
    const p = new FastPromise<number>();
    p.then(val => calls.push(val)).catch(() => null);
    p.reject(1);
    check(calls, []);
}


function test3() {
    const calls: number[] = [];
    const p = new FastPromise<number>();
    p.catch(val => 2)
        .then(val => calls.push(val));

    p.reject(1);
    check(calls, [2]);
}

function test4() {
    const calls: number[] = [];
    const p = new FastPromise<number>();
    p.then(() => 2)
        .catch(val => 3)
        .then(val => calls.push(val));

    p.reject(1);
    check(calls, [3]);
}

function test5() {
    const calls: number[] = [];
    const p = new FastPromise<number>();
    p.then(val => new FastPromise().resolve(val + 2))
        .catch(val => 30)
        .then(val => calls.push(val));

    p.resolve(1);
    check(calls, [3]);
}

function test6() {
    const calls: number[] = [];
    const p = new FastPromise<number>();
    p
        .then(val => new FastPromise().reject(val + 10))
        .catch((val: number) => {
            calls.push(val);
            return 7
        })
        .then(val => calls.push(val));

    p.resolve(1);
    check(calls, [11, 7]);
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
    check(calls, [1, 2, 2]);
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
    check(calls, [3, 7, 4, 3]);
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
    check(calls, [3]);
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
    check(calls, [5]);
}

function test11() {
    const calls: number[] = [];
    const p = new FastPromise<number>();
    p.resolve(1);
    p.then(val => calls.push(val));
    p.then(val => calls.push(val));
    check(calls, [1, 1]);
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
    check(calls, [6]);
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
    check(calls, [5]);
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
        check(arr, [0, 1, 2, 3, 4]);
    });
}
function test15() {

    FastPromise.race([
        sleeFastPromise(10).then(() => 0),
        FastPromise.resolve(1),
        FastPromise.resolve(2),
        3,
    ]).then(val => {
        check([val], [1]);
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
            check(calls, [1, 11, 21])
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
        check(arr, []);
    }).catch(val => {
        check([val], 2);
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
        check(arr, []);
    }).catch(val => {
        check([val], 2);
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
    check(calls, []);
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
    check(calls, [1]);
}

function test22() {
    const calls: number[] = [];
    const p = new FastPromise<number>();
    p.then(val => sleeFastPromise(10, 10).then(val => calls.push(val)));
    p.cancel();
    p.resolve(1);
    check(calls, []);
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
            check(calls, [10, 20])
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
    check(calls, [1]);
}
function test25() {
    const calls: number[] = [];
    FastPromise.onUnhandledRejection(val => {calls.push(val)});
    FastPromise.reject(2);
    FastPromise.onUnhandledRejection(null);
    setTimeout(() => {
        check(calls, [2]);
    }, 20);
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
