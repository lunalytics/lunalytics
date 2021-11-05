import * as importedTasks from '../tasks';

const tasks = Object.getOwnPropertyNames(importedTasks).filter(key => key !== '__esModule').map(key => importedTasks[key]);

export default async () => {
    // Start all the background tasks after 30s
    for (const task of tasks) {
        task.start();
    }
}