# Validation Summary: How to Build and Serve a Vue.js Application on RHEL

## Status
not-technically-relevant

## Post Type
Placeholder tutorial / guide

## Technologies Covered
- Red Hat Enterprise Linux
- Vue.js
- JavaScript
- DNF
- systemd
- firewalld

## Sources Consulted
- Vue.js Quick Start documentation - https://vuejs.org/guide/quick-start.html
- Vite Building for Production documentation - https://vite.dev/guide/build
- Red Hat Enterprise Linux 9 documentation: Installing RHEL 9 content with DNF - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_installing-rhel-9-content_managing-software-with-the-dnf-tool
- Red Hat Enterprise Linux documentation: Setting up and configuring NGINX - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/deploying_web_servers_and_reverse_proxies/setting-up-and-configuring-nginx

## Issues Found
- The post is a generic service setup template rather than a Vue.js on RHEL guide. It uses unresolved placeholders such as `<package-name>`, `<service>`, and `/etc/<service>/config.conf`, so the commands cannot be executed as written.
- The installation steps do not install Node.js, npm, Vue tooling, or a web server suitable for serving the built static assets. Official Vue documentation uses `npm create vue@latest` to scaffold a Vue app and `npm run build` to create a production build, while Red Hat documents installing Node.js through RHEL package content and NGINX with `dnf install nginx`.
- The service configuration and verification steps are not applicable to a standard Vue static build. A Vue/Vite production build produces static files in `dist` that should be served by a static web server or hosting platform; the post instead references a nonexistent generic service and command-line test.
- The firewall example uses `--add-service=<service>`, but no real firewalld service name is identified. Red Hat's NGINX examples open HTTP and HTTPS ports explicitly when preparing the web server.

## Review Notes
The post should be removed or replaced with a real tutorial. Salvaging it would require rewriting the article around actual RHEL, Node.js/npm, Vue/Vite build, static file deployment, web server, SELinux, and firewall steps, which is beyond the allowed scope for a technical validation pass.
