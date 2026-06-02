# Validation Summary: How to Set Up a MEAN Stack on EC2

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS EC2
- AWS CLI
- Amazon Linux 2023
- Node.js
- nvm
- npm
- Express.js
- Mongoose
- MongoDB Community Edition 7.0
- Angular CLI
- PM2
- nginx
- MongoDB Database Tools

## Sources Consulted
- AWS CLI `ec2 run-instances` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- nvm official README installation instructions: https://github.com/nvm-sh/nvm
- MongoDB Community Edition 7.0 installation on Amazon Linux: https://www.mongodb.com/docs/v7.0/tutorial/install-mongodb-on-amazon/
- MongoDB connection string documentation: https://www.mongodb.com/docs/manual/reference/connection-string/
- Express 5 migration guide: https://expressjs.com/en/guide/migrating-5/
- Angular CLI `ng new` reference: https://angular.dev/cli/new
- Angular CLI `ng build` reference: https://angular.dev/cli/build
- PM2 cluster mode documentation: https://pm2.io/docs/runtime/guide/load-balancing/
- nginx static content documentation: https://docs.nginx.com/nginx/admin-guide/web-server/serving-static-content/

## Issues Found
- The nvm install command used `v0.39.7`, while the official nvm README currently documents `v0.40.4`. Updated the command to use `v0.40.4`.
- The commands that created `/etc/yum.repos.d/mongodb-org-7.0.repo`, `/etc/mongod.conf`, and `/etc/nginx/conf.d/myapp.conf` used `sudo cat > ...`. That does not elevate the shell redirection and would fail for root-owned paths. Replaced these with `sudo tee ... > /dev/null << 'EOF'`.
- The Express catch-all route used `app.get('*', ...)`, which is invalid with Express 5's current path matching syntax. Updated it to `app.get('/{*splat}', ...)`, matching the official Express 5 migration guidance for a root-inclusive wildcard.
- The PM2 section started the same app once in fork mode and then again in cluster mode using the same name. Added `pm2 delete myapp` before the cluster-mode start so the command sequence does not create or conflict with a duplicate process entry.

## Review Notes
- The EC2 launch command uses placeholder IDs for the AMI, security group, subnet, and key pair. That is acceptable for a tutorial example, but readers must replace them with values from their AWS account and region.
- The MongoDB repository snippet is correct for MongoDB 7.0 on Amazon Linux 2023 x86_64. Future updates could consider MongoDB 8.0 if the post is refreshed for newer deployments.
- The nginx configuration is syntactically consistent with nginx `root` and `try_files` behavior. In a hardened production setup, serving static files from a user home directory may require additional filesystem and SELinux permission work or moving the built frontend under a web root such as `/var/www`.
