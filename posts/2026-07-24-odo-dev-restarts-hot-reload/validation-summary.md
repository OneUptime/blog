# Validation Summary: Why odo dev Keeps Restarting—and How to Configure Reliable Hot Reload

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- odo v3
- Devfile 2.3
- Kubernetes
- Node.js 22
- npm
- nodemon
- Hot reload and file synchronization

## Sources Consulted

- [odo dev command reference](https://odo.dev/docs/command-reference/dev/)
- [odo architecture: How odo works](https://odo.dev/docs/development/architecture/how-odo-works/)
- [odo Devfile reference](https://odo.dev/docs/development/devfile/)
- [odo guide: Pushing Source Files](https://odo.dev/docs/user-guides/advanced/pushing-specific-files/)
- [odo describe component command reference](https://odo.dev/docs/command-reference/describe-component/)
- [odo logs command reference](https://odo.dev/docs/command-reference/logs/)
- [odo v3.16.1 release and CLI help](https://github.com/redhat-developer/odo/releases/tag/v3.16.1)
- [Devfile 2.3 schema reference](https://devfile.io/docs/2.3.0/devfile-schema)
- [Devfile 2.3 JSON Schema](https://devfile.io/devfile-schemas/2.3.0.json)
- [Devfile guide: Adding a command group](https://devfile.io/docs/2.3.0/adding-a-command-group)
- [Devfile guide: Adding an exec command](https://devfile.io/docs/2.3.0/adding-an-exec-command)
- [nodemon official documentation](https://github.com/remy/nodemon)
- [npm ci documentation](https://docs.npmjs.com/cli/v11/commands/npm-ci/)
- [Node.js official container image](https://hub.docker.com/_/node)

## Issues Found

No technical issues found.

## Review Notes

- The YAML and JSON examples parse successfully.
- The `dev.odo.push.path:*` attributes are odo-specific rather than portable Devfile fields; the post already states this and recommends pinning and testing the consuming odo version.
- The Node.js examples correctly assume that the referenced project defines the corresponding npm scripts and includes nodemon when that watcher example is used.
