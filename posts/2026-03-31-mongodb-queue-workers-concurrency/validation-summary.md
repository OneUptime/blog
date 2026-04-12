# Validation Summary: How to Handle Queue Workers and Concurrency with MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (findOneAndUpdate, updateOne, updateMany)
- Node.js (process.pid, os.hostname, setInterval, Promise.all)
- MongoDB Node.js Driver (v5+/v6 API)

## Sources Consulted
- MongoDB documentation on findOneAndUpdate atomicity: https://www.mongodb.com/docs/manual/reference/method/db.collection.findOneAndUpdate/
- MongoDB Node.js Driver API documentation for findOneAndUpdate options (returnDocument): https://mongodb.github.io/node-mongodb-native/6.0/classes/Collection.html#findOneAndUpdate
- MongoDB documentation on $inc operator: https://www.mongodb.com/docs/manual/reference/operator/update/inc/
- MongoDB documentation on querying null/missing fields: https://www.mongodb.com/docs/manual/tutorial/query-for-null-fields/
- MongoDB documentation on updateMany result (modifiedCount): https://mongodb.github.io/node-mongodb-native/6.0/interfaces/UpdateResult.html
- Node.js os.hostname() API: https://nodejs.org/api/os.html#oshostname

## Issues Found
- **Missing `lockedBy` guard in error handler**: In the `runWorker` function, the error handling path used `await col.updateOne({ _id: job._id }, update)` without filtering on `lockedBy: WORKER_ID`. The success path correctly included this guard. Without it, if the stalled-job recovery process reclaims a job and another worker picks it up, the original worker's error handler could overwrite the new worker's in-progress state — either resetting the job to 'pending' (causing duplicate processing) or marking it as 'failed' while another worker is actively processing it. Fixed by adding `lockedBy: WORKER_ID` to the error path filter: `await col.updateOne({ _id: job._id, lockedBy: WORKER_ID }, update)`.

## Review Notes
- The `processJobWithHeartbeat` function is shown as a standalone utility but is not integrated into the `runWorker` loop. This is fine for illustrative purposes, but readers may need guidance on where to substitute it.
- The `setInterval` heartbeat callback is async but its rejected promise is not caught. In production, an error handler or `.catch()` should be added to prevent unhandled promise rejections.
- The post implicitly targets MongoDB Node.js Driver v5+/v6 (where `findOneAndUpdate` returns the document directly rather than a `{ value: doc }` wrapper). This is the current API and is correct.
- For high-throughput production use, an index on `{ status: 1, lockedAt: 1, createdAt: 1 }` would be recommended to support the `claimJob` query efficiently. The post doesn't mention indexing.
