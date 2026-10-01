
const { setTimeout: wait } = require('timers/promises');
const fs = require('fs');

const logo = fs.readFileSync('./assets/logo.txt', 'utf8');
const divider = fs.readFileSync('./assets/divider.txt', 'utf8');



const queue = [];
const visitedCoords = new Set();
const mappedCoords = {};
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






function displayMaze() {

    let minX = 0;
    let maxX = 0;
    let minY = 0;
    let maxY = 0;

    for (const [key, values] of Object.entries(mappedCoords)) {
        if (values.x < minX) minX = values.x;
        else if (values.x > maxX) maxX = values.x;
        if (values.y < minY) minY = values.y;
        else if (values.y > maxY) maxY = values.y;
    }


    let generatedDisplay = '';

    for (let y = maxY; y >= minY; y--) {
        for (let x = minX; x <= maxX; x++) {
            const coordsKey = `${x}, ${y}`;
            const cell = mappedCoords[coordsKey];
            if (cell) {
                // Exit
                if (cell.value === 4) {
                    generatedDisplay += '\x1b[32m██\x1b[0m';
                }
                // Secrets
                else if (cell.value === 3) {
                    generatedDisplay += '\x1b[38;5;208m██\x1b[0m';
                }
                // Spawn
                else if (cell.value === 2) {
                    generatedDisplay += '\x1b[34m██\x1b[0m';
                }
                else {
                    generatedDisplay += '██';
                }
            }
            else {
                generatedDisplay += '  ';
            }
        }
        generatedDisplay += '\n';
    }

    return generatedDisplay;
}






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

    if (!htmlResponse.includes('BONK!')) {
        // Mark as visited
        const coords = getCoords(pPath);
        const formattedCoords = `${coords.x}, ${coords.y}`;
        visitedCoords.add(formattedCoords);

        if (htmlResponse.includes('Ça avance bien!')) {
            mappedCoords[formattedCoords] = { ...coords, value: 1};
        }
        else if (htmlResponse.includes('CEM')) {
            mappedCoords[formattedCoords] = { ...coords, value: 4};
        }
        else {
            mappedCoords[formattedCoords] = { ...coords, value: 3};
        }

        const unpairCoords = getCoords(pPath.substring(0, pPath.length - 1));
        const formattedUnpairCoords = `${unpairCoords.x}, ${unpairCoords.y}`;
        visitedCoords.add(formattedUnpairCoords);
        mappedCoords[formattedUnpairCoords] = { ...unpairCoords, value: 1};

        // Queue new paths
        queuePush(pPath);
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

    mappedCoords[`0, 0`] = { x: 0, y: 0, value: 2};
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

        const consoleMaze = displayMaze();

        console.clear();
        console.log(`${divider}\n`);
        console.log(`${logo}`);
        console.log(`\n${divider}\n`);
        console.log(`TIME\n${String(minsPast).padStart(2, '0')}:${String(secsPast).padStart(2, '0')}`);
        console.log(`\n${divider}\n`);
        console.log(consoleMaze);
        
        await processPath(currentPath);
        index++;
    }
    
}


solve();