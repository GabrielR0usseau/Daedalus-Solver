
const { setTimeout: wait } = require('timers/promises');



const queue = new Set();
const SIMULTANEOUS_REQS = 4;
const DIRS = ['l', 'u', 'r', 'd'];
const REVERSED_DIRS = {
    'l': 'r',
    'u': 'd',
    'r': 'l',
    'd': 'u'
};



async function processPath(pPath) {

    const encodedPath = btoa(pPath);
    console.log(encodedPath);

    const response = await fetch("https://daedalus.pobrillant.org/move", {
        headers: {
            'Cookie': `path=${encodedPath}`
        }
    });

    if (response.status === 429) {
        const retryIn = response.headers.get('x-retry-in') ?? 50;
        const delayMs = parseInt(retryIn, 10);
        await wait(delayMs);
        return processPath(pPath);
    }

    const htmlResponse = await response.text();

    if (htmlResponse.includes('Ça avance bien!')) {
        queuePush(pPath);
    }
    else if (!htmlResponse.includes('BONK!')) {
        console.log();
        console.log(`EXIT FOUND! At: '${pPath}'`);
        return true;
    }

    return false;
}


function queuePush(pPath) {

    const lastDir = pPath[pPath.length - 1];

    for (const dir of DIRS) {
        if (REVERSED_DIRS[dir] === lastDir) continue;
        queue.add(pPath + dir);
    }
}


async function solve() {

    const startTime = Date.now();

    queuePush('');

    const queueIterator = queue.values();
    let index = 0;

    while (index < queue.size) {

        const batch = [];

        for (let i = 0; i < SIMULTANEOUS_REQS && index < queue.size; i++) {
            const currentPath = queueIterator.next().value;
            batch.push(processPath(currentPath));
            index++;
        }

        const results = await Promise.all(batch);

        if (results.includes(true)) {
            break;
        }
        
    }

    console.log();
    console.log(`STATS`);
    console.log(`Took: ${((Date.now() - startTime) / 1000).toFixed(2)} seconds`);
    console.log(`Iterations: ${index.toLocaleString('en-US')}`);
    console.log(`Queue size: ${queue.size.toLocaleString('en-US') }`);
}


solve();