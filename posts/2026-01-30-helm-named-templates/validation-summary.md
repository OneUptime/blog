# Validation Summary: How to Build Helm Named Templates

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Helm
- Kubernetes manifests
- Go templates
- YAML

## Sources Consulted
- Helm Chart Template Guide: Named Templates - https://helm.sh/docs/chart_template_guide/named_templates/
- Helm Chart Development Tips and Tricks - https://helm.sh/docs/howto/charts_tips_and_tricks/
- Helm Template Function List - https://helm.sh/docs/chart_template_guide/function_list/
- Helm Chart Template Guide: Flow Control - https://helm.sh/docs/chart_template_guide/control_structures/
- Helm Chart Template Guide: Built-in Objects - https://helm.sh/docs/chart_template_guide/builtin_objects/
- Helm `template` command documentation - https://helm.sh/docs/helm/helm_template/
- Helm `lint` command documentation - https://helm.sh/docs/helm/helm_lint/

## Issues Found
- The post said named templates "live" in underscore-prefixed files. Helm's documentation describes underscore-prefixed files as the conventional place for partials and helpers, but named templates can be defined in template files generally. Changed the wording to say they are usually placed in underscore-prefixed files.
- The post described passing `.` to `include` as passing the root scope. In Helm templates, `.` is the current scope and can change inside `with`, `range`, or when a subobject is passed. Updated the wording to say `.` passes the current chart context at the top level, and added a short note that `$` should be used when passing the root chart context from inside a changed scope.
- The custom context example used `.name`, which would be empty unless the caller had already passed a context containing `name`. Changed it to set `name` from `include "mychart.fullname" .`, making the example work with the normal root chart context used elsewhere in the post.

## Review Notes
The Helm commands shown are current in Helm 4.2.0 documentation. The local environment did not have the `helm` binary installed, so command verification was done against official Helm command documentation rather than local `--help` output.
