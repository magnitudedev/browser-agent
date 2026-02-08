/**
 * Example: Using agent.pause() / agent.resume() for human-in-the-loop control
 *
 * Pauses the agent after every action so you can review and decide
 * whether to continue or stop.
 */
import { startBrowserAgent } from '../src/agent/browserAgent';
import * as readline from 'readline';

function askUser(question: string): Promise<string> {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim().toLowerCase());
        });
    });
}

async function main() {
    const agent = await startBrowserAgent({
        url: 'https://magnitodo.com',
        narrate: true,
    });

    // Pause after every action for human review
    agent.events.on('actionDone', () => {
        agent.pause();
    });

    // On each pause, prompt the user
    agent.events.on('pause', async () => {
        const answer = await askUser('Continue? (y = resume, n = stop): ');
        if (answer === 'n') {
            await agent.stop();
        } else {
            agent.resume();
        }
    });

    await agent.act('create 3 todos');
    await agent.act('check off each todo');
    await agent.stop();
}

main();
