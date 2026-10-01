
const { setTimeout: wait } = require('timers/promises');

const fs = require('fs');

const logo = fs.readFileSync('./logo.txt', 'utf8');



const queue = new Set();
const DIRS = ['l', 'u', 'r', 'd'];
const REVERSED_DIRS = {
    'l': 'r',
    'u': 'd',
    'r': 'l',
    'd': 'u'
};



async function processPath(pPath) {

    const encodedPath = btoa(pPath);

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
        queue.add(pPath + dir + dir); // Maze always has pairs
    }
}


async function solve() {

    const startTime = Date.now();

    queuePush('');

    const queueIterator = queue.values();
    let index = 0;

    while (index < queue.size) {

        const currentPath = queueIterator.next().value;

        // Format time passed
        const minsPast = Math.floor((Date.now() - startTime) / 1000 / 60);
        const secsPast = Math.floor((Date.now() - startTime) / 1000 % 60);


        console.clear();
        console.log(`${logo}`);
        console.log(`\nTime\n${String(minsPast).padStart(2, '0')}:${String(secsPast).padStart(2, '0')}`);
        console.log(`\nIterations\n${index.toLocaleString('en-US')}`);
        console.log(`\nCurrent Path Length\n${currentPath.length.toLocaleString('en-US')}`);
        console.log(`\nCurrent Path\n${currentPath}`);

        if (await processPath(currentPath)) break;
        index++;
    }
    
}


solve();