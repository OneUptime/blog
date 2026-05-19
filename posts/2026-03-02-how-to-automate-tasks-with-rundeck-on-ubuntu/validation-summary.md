# Validation Summary: How to Automate Tasks with Rundeck on Ubuntu

## Status
validated

## Post Type
Tutorial / installation and automation guide

## Technologies Covered
- Ubuntu
- Rundeck Open Source / PagerDuty Runbook Automation
- Rundeck `rd` CLI
- Rundeck REST API
- Rundeck job YAML
- Rundeck resource YAML / node sources
- Rundeck ACL policy YAML
- Java
- SSH
- systemd

## Sources Consulted
- Rundeck Ubuntu/Debian installation docs: https://docs.rundeck.com/docs/administration/install/linux-deb.html
- Rundeck instance system requirements: https://docs.rundeck.com/docs/administration/install/system-requirements.html
- Rundeck database configuration docs: https://docs.rundeck.com/docs/administration/configuration/database/
- Rundeck configuration file reference: https://docs.rundeck.com/docs/administration/configuration/config-file-reference.html
- Rundeck authentication / `realm.properties` docs: https://docs.rundeck.com/docs/administration/security/authentication.html
- Rundeck built-in users docs: https://docs.rundeck.com/docs/administration/security/default-users.html
- Rundeck project creation docs: https://docs.rundeck.com/docs/manual/projects/project-create.html
- Rundeck node source docs: https://docs.rundeck.com/docs/manual/projects/resource-model-sources/
- Rundeck built-in resource model source docs: https://docs.rundeck.com/docs/manual/projects/resource-model-sources/builtin.html
- Rundeck resource YAML format reference: https://docs.rundeck.com/docs/manual/document-format-reference/resource-yaml-v13.html
- Rundeck job YAML format reference: https://docs.rundeck.com/docs/manual/document-format-reference/job-yaml-v12.html
- Rundeck CLI command reference: https://docs.rundeck.com/docs/rd-cli/commands.html
- Rundeck CLI scripting / output format docs: https://docs.rundeck.com/docs/rd-cli/scripting.html
- Rundeck API reference: https://docs.rundeck.com/docs/api/
- Rundeck ACL policy format reference: https://docs.rundeck.com/docs/manual/document-format-reference/aclpolicy-v10.html

## Issues Found
- The Java requirement was too broad. Current Rundeck docs specify Java 11 or Java 17 runtime support, so the text now says Java 11 or Java 17 and installs `openjdk-11-jre-headless` instead of a full JDK.
- The H2 JDBC URL used the stale `MVCC=true` option. It was replaced with the current documented H2 URL using `DB_CLOSE_ON_EXIT=FALSE` and `NON_KEYWORDS`.
- The password update example recommended MD5 hashing. Rundeck supports MD5, but official docs recommend BCRYPT and warn against MD5, so the example now uses BCRYPT and points to Rundeck's password utility.
- The node inventory section created `resources.yaml` but did not register it as a File Node Source. Added the required Project Settings step and `resourceyaml` format.
- The project creation command used `--project`; official docs show `rd projects create -p MyProject`, so the command was corrected.
- The job YAML used `nodeKeepgoing` and `default`, which are not the documented job YAML fields. The node dispatch setting now lives under `nodefilters.dispatch.keepgoing`, and the option default uses `value`.
- The job import command used `--format yaml`; the official job YAML docs show `-F yaml`, so the command was corrected.
- The job ID lookup used `--format json`; the official CLI docs use the `RD_FORMAT=json` environment variable for JSON output, so the command was corrected.
- The `rd run --job "$JOB_ID"` command mixed the name-based `--job` flag with a job ID. It now uses `--id`.
- The execution history commands used `rd executions list` for completed history and `rd executions output`, which is not in the current official CLI command list. They now use `rd executions query` for completed executions and the documented execution output API for log retrieval.

## Review Notes
- The installation repository commands are plausible for the Rundeck package repository, though the official docs also show a repository setup script as an alternative.
- The article still uses H2 for a simple setup while warning to use MySQL or PostgreSQL for production, which matches the official guidance that H2 is only for testing/non-production use.
