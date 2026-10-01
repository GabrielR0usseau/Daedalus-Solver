
const { setTimeout: wait } = require('timers/promises');
const fs = require('fs');

const logo = fs.readFileSync('./assets/logo.txt', 'utf8');
const divider = fs.readFileSync('./assets/divider.txt', 'utf8');



const queue = [];
const visitedCoords = new Set();
const DIRS = {
    'l': {
        x: -1,
        y: 0,
        sides: ['d', 'u', 'l']
    },
    'u': {
        x: 0,
        y: 1,
        sides: ['l', 'r', 'u']
    },
    'r': {
        x: 1,
        y: 0,
        sides: ['u', 'd', 'r']
    },
    'd': {
        x: 0,
        y: -1,
        sides: ['r', 'l', 'd']
    }
};





function getCoords(pPath) {
    let x = 0;
    let y = 0;

    for (const dir of pPath) {
        const dirObj = DIRS[dir];
        x += dirObj.x;
        y += dirObj.y;
    }

    return { x, y };
}



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

        // Mark as visited
        const coords = getCoords(pPath);
        visitedCoords.add(`${coords.x}, ${coords.y}`);

        // Queue new paths
        queuePush(pPath);
    }
    else if (htmlResponse.includes('CEM')) {
        console.log("EXIT FOUND!\n");
        fs.writeFileSync('solution.txt', pPath);
        return true;
    }

    return false;
}


function queuePush(pPath) {

    const lastDir = pPath[pPath.length - 1];
    const sides = DIRS[lastDir]?.sides ?? Object.keys(DIRS);

    for (const dir of sides) {
        queue.push(pPath + dir + dir); // Maze always has pairs
    }
}


async function solve() {

    const startTime = Date.now();

    queuePush('');

    let index = 0;

    while (queue.length > 0) {

        const currentPath = queue.pop();
        const currentCoords = getCoords(currentPath);
        const formattedCoords = `${currentCoords.x}, ${currentCoords.y}`;
        if (visitedCoords.has(formattedCoords)) {
            continue;
        }

        // Format time passed
        const minsPast = Math.floor((Date.now() - startTime) / 1000 / 60);
        const secsPast = Math.floor((Date.now() - startTime) / 1000 % 60);

        console.clear();
        console.log(`${divider}\n`);
        console.log(`${logo}`);
        console.log(`\n${divider}\n`);
        console.log(`TIME\n${String(minsPast).padStart(2, '0')}:${String(secsPast).padStart(2, '0')}`);
        console.log(`\n${divider}\n`);
        console.log(`ITERATIONS\n${index.toLocaleString('en-US')}`);
        console.log(`\n${divider}\n`);
        console.log(`COORDS\n${formattedCoords}`);
        console.log(`\n${divider}\n`);
        console.log(`PATH LENGTH\n${currentPath.length.toLocaleString('en-US')}`);
        console.log(`\n${divider}\n`);
        console.log(`PATH\n${currentPath}`);
        console.log(`\n${divider}\n`);

        if (await processPath(currentPath)) return currentPath;
        index++;
    }

    console.log("NO EXIT FOUND.");
    
}


solve();