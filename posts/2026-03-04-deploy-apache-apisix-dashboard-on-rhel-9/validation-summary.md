# Validation Summary: How to Deploy Apache APISIX Dashboard on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Apache APISIX
- Apache APISIX Dashboard
- etcd
- systemd
- firewalld
- RPM/DNF package management
- APISIX Admin API

## Sources Consulted
- Apache APISIX Installation Guide: https://apisix.apache.org/docs/apisix/installation-guide/
- Apache APISIX Admin API documentation: https://apisix.apache.org/docs/apisix/3.14/admin-api/
- Apache APISIX Dashboard documentation: https://apisix.apache.org/docs/apisix/dashboard/
- Legacy Apache APISIX Dashboard installation documentation: https://apisix.apache.org/docs/dashboard/install/
- Apache APISIX Dashboard 3.0.1 GitHub release assets: https://github.com/apache/apisix-dashboard/releases/tag/v3.0.1
- Apache APISIX RHEL 9 repository metadata: https://repos.apiseven.com/packages/redhat/9/x86_64/repodata/repomd.xml
- Apache APISIX Dashboard 3.0 default configuration: https://github.com/apache/apisix-dashboard/blob/release/3.0/api/conf/conf.yaml
- etcd GitHub releases: https://github.com/etcd-io/etcd/releases

## Issues Found
- The post used the CentOS APISIX repository URL. Updated it to the Red Hat repository URL documented by APISIX.
- The prerequisite asked users to install `epel-release`, but the APISIX repository command needs `yum-config-manager`, provided by `dnf-plugins-core` on RHEL-style systems. Updated the prerequisite and command.
- The offline APISIX RPM URL pointed to a non-existent CentOS 9 `apisix-3.8.0-0.el9` package. Updated it to the current RHEL 9 APISIX RPM path available in the APISIX repository metadata.
- The APISIX configuration placed Admin API keys under `apisix.admin_key`, but APISIX 3.x documents them under `deployment.admin.admin_key`. Moved the Admin API configuration to the correct section and added the documented `admin_listen` settings.
- The post used port `9080` for Admin API calls. APISIX 3.x uses `9180` for the Admin API by default, while `9080` is the HTTP proxy listener. Updated all Admin API examples to use `9180`.
- The post installed standalone APISIX Dashboard 3.0.1 alongside APISIX 3.8. Official APISIX documentation says Dashboard 3.0.1 is legacy and should only be used with APISIX 3.0; current APISIX releases include the Dashboard UI. Replaced the standalone dashboard installation, configuration, and service instructions with built-in dashboard enablement and access instructions.
- The post referenced a non-existent Dashboard `el9` RPM. Removed that command and noted that the legacy standalone dashboard is not required for current APISIX releases on RHEL 9.
- The firewall and access instructions exposed port `9000` for the old standalone dashboard. Updated them to expose `9180` for the built-in dashboard UI.
- The dashboard access instructions described an `admin/admin` login for the standalone dashboard. Updated them to use the Admin API key prompt used by the built-in dashboard.

## Review Notes
The tutorial now targets the current APISIX RHEL 9 package flow and built-in Dashboard UI. The example allows Admin API access from all IPv4 clients so the remote dashboard URL works as written, but the post explicitly tells readers to replace that with trusted client IP ranges for production use.
