import auth from './auth';
import db from './db';
import tasks from './tasks';

export default async () => {
    await db();
    await auth();
    await tasks();
}