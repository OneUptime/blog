# Validation Summary: How to Configure Flagger Load Tester with Custom Shell Commands

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flagger
- Flagger loadtester
- Kubernetes Canary resources
- Kubernetes webhooks
- Bash and POSIX shell commands
- curl
- jq

## Sources Consulted
- Flagger Webhooks documentation: https://docs.flagger.app/usage/webhooks
- Flux Flagger Webhooks documentation: https://fluxcd.io/flagger/usage/webhooks/
- Flagger loadtester Bash task source: https://github.com/fluxcd/flagger/blob/main/pkg/loadtester/bash.go
- Flagger loadtester shell task source: https://github.com/fluxcd/flagger/blob/main/pkg/loadtester/task_shell.go
- Flagger loadtester webhook handler source: https://github.com/fluxcd/flagger/blob/main/pkg/loadtester/server.go
- Flagger Canary API type definitions: https://github.com/fluxcd/flagger/blob/main/pkg/apis/flagger/v1beta1/canary.go
- curl manual for `--fail` / `-f`: https://curl.se/docs/manpage.html
- jq manual for `--exit-status` / `-e`: https://jqlang.org/manual/

## Issues Found
- The post described both `type: bash` and `type: cmd` as command types whose exit code determines the webhook response. In the current Flagger loadtester implementation, `type: bash` is blocking and maps command success to HTTP 200, while `type: cmd` queues an asynchronous task and returns HTTP 202 from the webhook handler. Updated the introduction and `cmd` vs `bash` section.
- The post said `type: bash` uses `/bin/sh -c`. Flagger's `BashTask` uses `bash -c`. Updated the shell description.
- The post said `type: cmd` executes directly without a shell wrapper. Flagger's `CmdTask` uses `sh -c`. Updated the description.
- The API validation multi-line shell example could incorrectly succeed if an earlier command failed but the final command succeeded. Added `set -e` to make failures fail the whole webhook.
- The curl health-check explanation said any non-200 response causes `curl -f` to fail. `curl -f` fails on HTTP response codes 400 or higher, not every non-200 status. Updated the explanation.
- The timeout section only mentioned the Flagger webhook timeout. For blocking shell commands, the loadtester command timeout also matters. Added that caveat.

## Review Notes
- The Canary resource field names, webhook types, metadata shape, and `type: bash` examples match Flagger's documented and source-defined API.
- The examples assume the loadtester image contains the referenced tools such as `curl`, `jq`, and any custom test binary. Custom binaries may require a derived loadtester image.
