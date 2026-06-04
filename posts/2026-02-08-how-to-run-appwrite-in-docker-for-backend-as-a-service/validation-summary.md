# Validation Summary: How to Run Appwrite in Docker for Backend-as-a-Service

## Status
validated

## Post Type
Tutorial / self-hosting guide

## Technologies Covered
- Appwrite self-hosting
- Docker and Docker Compose
- Appwrite CLI
- Appwrite REST APIs
- Appwrite Web SDK
- Appwrite Databases
- Appwrite Authentication
- Appwrite Storage
- Appwrite Functions
- MariaDB backups

## Sources Consulted
- Appwrite self-hosted installation docs: https://appwrite.io/docs/advanced/self-hosting/installation
- Appwrite self-hosted database configuration docs: https://appwrite.io/docs/advanced/self-hosting/configuration/databases
- Appwrite self-hosted updates and migrations docs: https://appwrite.io/docs/advanced/self-hosting/production/updates
- Appwrite self-hosted backups docs: https://appwrite.io/docs/advanced/self-hosting/production/backups
- Appwrite CLI installation docs: https://appwrite.io/docs/tooling/command-line/installation
- Appwrite CLI command docs: https://appwrite.io/docs/tooling/command-line/commands
- Appwrite CLI functions docs: https://appwrite.io/docs/tooling/command-line/functions
- Appwrite Databases server REST API reference: https://appwrite.io/docs/references/cloud/server-rest/databases
- Appwrite Storage server REST API reference: https://appwrite.io/docs/references/cloud/server-rest/storage
- Appwrite Account Web SDK reference: https://appwrite.io/docs/references/cloud/client-web/account
- Appwrite email/password authentication docs: https://appwrite.io/docs/products/auth/email-password
- Current Appwrite CLI help output from `appwrite-cli@22.0.0`

## Issues Found
- The prerequisites understated current Appwrite self-hosting requirements. Updated the requirements to include 2 CPU cores, 4GB RAM, and 2GB swap.
- The Docker installer command used the older `appwrite/appwrite:1.5` image and omitted the setup wizard port. Updated it to `appwrite/appwrite:1.9.0` with `--publish 20080:20080` and described the web setup wizard.
- The manual Docker Compose example was an incomplete Appwrite stack and would not correctly run current Appwrite. Replaced it with guidance to use the official generated `docker-compose.yml` and `.env` files and noted required secrets and database backend choices.
- The start command omitted the `appwrite` directory and current `--remove-orphans` recommendation. Updated the command sequence.
- The CLI project example used a non-current project creation flow. Updated it to create the project in the Console and run `appwrite init project`.
- The Web SDK authentication example used deprecated positional arguments and string `"unique()"`. Updated it to use object arguments and `ID.unique()`.
- The Functions CLI examples used camelCase commands and flags. Updated them to current kebab-case commands and options, including `create-deployment`, `--function-id`, `--commands`, and `--activate`.
- The MariaDB backup example backed up only one schema with application credentials. Updated it to the official root-based `mysqldump --all-databases` approach with restore command.
- The upgrade section incorrectly implied `docker compose pull` plus restart was sufficient. Updated it to use Appwrite's upgrade entrypoint and explicit `docker compose exec appwrite migrate`.

## Review Notes
The post is now technically valid for Appwrite 1.9-era self-hosting. Appwrite 1.9 defaults to MongoDB for new installs, while MariaDB remains selectable; the backup example is specifically for MariaDB because that is the database backend discussed in the post.
