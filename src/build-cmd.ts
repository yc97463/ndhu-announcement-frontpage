import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';

const args = process.argv.slice(2);
const command = args[0];

const runScript = (scriptName: string): ChildProcess => {
    const scriptPath = path.join(process.cwd(), 'src', `${scriptName}.ts`);
    console.log(`Running ${scriptPath}...`);
    const child = spawn('node', ['--loader', 'ts-node/esm', scriptPath, ...args.slice(1)], { stdio: 'inherit' });
    child.on('error', (error: Error) => {
        console.error(`Error running ${scriptName}:`, error);
    });
    return child;
};

if (command === 'index') {
    console.log('Generating index page...');
    runScript('generate-index');
} else if (command === 'single') {
    console.log('Generating single news pages...');
    runScript('generate');
} else if (command === 'all') {
    console.log('Generating both index and single news pages...');
    runScript('generate-index');
    runScript('generate');
} else {
    console.error('Invalid command. Use "index", "single", or "all".');
    process.exit(1);
}