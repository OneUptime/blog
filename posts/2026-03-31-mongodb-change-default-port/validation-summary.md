# Validation Summary: How to Change the Default MongoDB Port

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (mongod, mongosh, mongodump, mongorestore)
- YAML configuration (mongod.conf)
- Node.js MongoDB driver (MongoClient)
- Python PyMongo driver (MongoClient)
- Linux systemd (systemctl)
- iptables and UFW firewalls
- ss (socket statistics) CLI tool

## Sources Consulted
- MongoDB documentation: mongod configuration file options (https://www.mongodb.com/docs/manual/reference/configuration-options/#net-options)
- MongoDB documentation: mongod command-line options (https://www.mongodb.com/docs/manual/reference/program/mongod/)
- MongoDB documentation: connection string URI format (https://www.mongodb.com/docs/manual/reference/connection-string/)
- MongoDB documentation: rs.reconfig() (https://www.mongodb.com/docs/manual/reference/method/rs.reconfig/)
- MongoDB documentation: mongodump and mongorestore (https://www.mongodb.com/docs/database-tools/mongodump/)
- PyMongo documentation: MongoClient (https://pymongo.readthedocs.io/en/stable/api/pymongo/mongo_client.html)
- Node.js MongoDB driver documentation (https://www.mongodb.com/docs/drivers/node/current/)

## Issues Found
No technical issues found.

## Review Notes
- The `mongodump --db` flag generates a deprecation warning in MongoDB 4.4+ (recommending `--uri` instead), but remains functional. This is not an error in the post but could be noted in a future update.
- The use of `force: true` in `rs.reconfig()` is appropriate for the described scenario (port migration where members may be temporarily unreachable), but readers should be aware that `force: true` should generally be avoided when a majority of members are reachable, as it can cause rollbacks.
- The Python code example is placed inside a JavaScript-labeled code block alongside the Node.js example. This is a minor formatting choice, not a technical error.
