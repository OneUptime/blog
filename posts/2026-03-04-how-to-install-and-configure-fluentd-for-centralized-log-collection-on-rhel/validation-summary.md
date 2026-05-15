# Validation Summary: How to Install and Configure Fluentd for Centralized Log Collection on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RHEL
- Fluentd
- fluent-package
- systemd
- Fluentd tail, HTTP, parser, record_transformer, and stdout plugins
- fluent-plugin-elasticsearch
- fluent-plugin-systemd
- Elasticsearch

## Sources Consulted
- Fluentd RPM Package installation documentation: https://docs.fluentd.org/installation/install-fluent-package/install-by-rpm-fluent-package
- Fluentd tail input plugin documentation: https://docs.fluentd.org/input/tail
- Fluentd syslog parser documentation: https://docs.fluentd.org/parser/syslog
- Fluentd HTTP input plugin documentation: https://docs.fluentd.org/input/http
- Fluentd record_transformer filter documentation: https://docs.fluentd.org/filter/record_transformer
- Fluentd parser filter documentation: https://docs.fluentd.org/filter/parser
- Fluentd buffer configuration documentation: https://docs.fluentd.org/configuration/buffer-section
- fluent-plugin-elasticsearch documentation: https://github.com/uken/fluent-plugin-elasticsearch
- fluent-plugin-systemd documentation: https://github.com/fluent-plugins-nursery/fluent-plugin-systemd

## Issues Found
- The installation section referred to "td-agent" while using the newer Fluent Package installer. Fluentd's official RPM documentation identifies `fluent-package` as the current stable distribution package maintained by the Fluentd Project, and lists `td-agent` as obsolete/EOL. I updated the section heading and package comment to use `fluent-package`.
- The installer URL used `install-redhat-fluent-package5-lts.sh`, but official Fluentd documentation now lists Fluent Package v6 LTS as the current LTS installer and marks Fluent Package v5 as EOL. I updated the command to `https://fluentd.cdn.cncf.io/sh/install-redhat-fluent-package6-lts.sh`.

## Review Notes
- The Fluentd configuration snippets use documented plugin names and parameters for tail input, syslog and JSON parsing, HTTP input, stdout output, record transformation, parser filtering, file buffers, Elasticsearch output, and systemd journal input.
- The systemd override for `LimitNOFILE` uses valid systemd drop-in syntax. Production deployments may also need OS-level pre-installation tuning and log file permission checks depending on the RHEL environment and service user.
