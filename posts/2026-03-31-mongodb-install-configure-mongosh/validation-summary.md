# Validation Summary: How to Install and Configure mongosh for MongoDB

## Status
validated

## Post Type
Tutorial / Installation Guide

## Technologies Covered
- MongoDB
- mongosh (MongoDB Shell)
- apt / yum (Linux package managers)
- Homebrew (macOS package manager)
- winget (Windows package manager)

## Sources Consulted
- MongoDB mongosh documentation: https://www.mongodb.com/docs/mongodb-shell/
- mongosh configuration reference: https://www.mongodb.com/docs/mongodb-shell/reference/configure-shell-settings/
- mongosh prompt customization: https://www.mongodb.com/docs/mongodb-shell/reference/customize-prompt/
- mongosh `edit` command reference: https://www.mongodb.com/docs/mongodb-shell/reference/editor-mode/
- MongoDB connection string format: https://www.mongodb.com/docs/manual/reference/connection-string/

## Issues Found

1. **Incorrect prompt customization method** (line 89): The post used `config.set("prompt", "mydb> ")`, but `prompt` is not a valid `config.set()` key. In mongosh, the prompt is customized by assigning a string or function to the `prompt` variable directly (e.g., `prompt = "mydb> "`), either in the shell or in `~/.mongoshrc.js`. Fixed to `prompt = "mydb> "` with a comment noting the `.mongoshrc.js` option.

2. **Conflation of `.editor` and `edit` commands** (lines 103-108): The post stated `config.set("editor", "vim")` configures the `.editor` command, but `.editor` is an inline multi-line REPL mode inherited from Node.js that is unrelated to the `editor` config setting. The `editor` config key controls which external editor is launched by the `edit` command. Fixed the comment to reference the `edit` command and updated the description accordingly.

## Review Notes
- The Linux apt installation section uses the MongoDB Server 7.0 repository to install mongosh. While this works, mongosh can also be installed standalone without the full server repository. This is not incorrect but worth noting for readers who only need the shell.
- The RHEL/CentOS section (`sudo yum install -y mongosh`) assumes the MongoDB yum repository is already configured, unlike the Ubuntu section which shows full setup. This inconsistency is a style choice rather than a technical error.
- The winget package ID `MongoDB.Shell` should be verified against the current winget repository, as the ID may vary; `MongoDB.mongosh` is another commonly referenced ID.
- The config file path `~/.mongodb/mongosh/config` and history path `~/.mongodb/mongosh/mongosh_repl_history` are correct for typical Linux/macOS installations.
