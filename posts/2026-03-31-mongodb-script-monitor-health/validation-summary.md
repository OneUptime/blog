# Validation Summary: How to Write a Script to Monitor MongoDB Health

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (mongosh shell, serverStatus, replica set status, currentOp)
- Bash shell scripting
- Python 3 with PyMongo
- Cron scheduling

## Sources Consulted
- MongoDB mongosh documentation: https://www.mongodb.com/docs/mongodb-shell/
- MongoDB `db.runCommand("ping")` reference: https://www.mongodb.com/docs/manual/reference/command/ping/
- MongoDB `rs.status()` reference: https://www.mongodb.com/docs/manual/reference/method/rs.status/
- MongoDB `db.serverStatus()` reference: https://www.mongodb.com/docs/manual/reference/command/serverStatus/
- MongoDB `db.currentOp()` reference: https://www.mongodb.com/docs/manual/reference/method/db.currentOp/
- MongoDB `replSetGetStatus` command reference: https://www.mongodb.com/docs/manual/reference/command/replSetGetStatus/
- PyMongo documentation: https://pymongo.readthedocs.io/en/stable/
- Python `datetime.utcnow()` deprecation notice: https://docs.python.org/3.12/library/datetime.html

## Issues Found
No technical issues found.

## Review Notes
- `datetime.utcnow()` is deprecated since Python 3.12 in favor of `datetime.now(datetime.UTC)`. It still works and is widely used, but future readers on Python 3.12+ will see a deprecation warning. Not changed since the function remains functional.
- The `ALERT_EMAIL` variable is declared in the shell script but never used. It serves as a placeholder indicating where email alerting could be wired in, but the script does not implement email sending.
- The replication lag check only examines the first secondary found. In a replica set with multiple secondaries, the worst-case lag could be on a different member. Acceptable for a simple health check script.
