# Validation Summary: How to Deploy RHEL Image Builder via Cockpit Web Console

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- RHEL Image Builder
- Cockpit web console
- systemd
- firewalld
- DNF

## Sources Consulted
- Red Hat Documentation: Installing RHEL image builder for customized RHEL system images: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_a_customized_rhel_system_image/installing-composer_composing-a-customized-rhel-system-image
- Red Hat Documentation: Setting up RHEL image builder for RHEL for Edge images: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_installing_and_managing_rhel_for_edge_images/setting-up-image-builder_composing-installing-managing-rhel-for-edge-images
- Red Hat Documentation: Accessing RHEL image builder in the RHEL web console: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/composing_installing_and_managing_rhel_for_edge_images/index#accessing-image-builder-in-the-rhel-web-console_composing-installing-managing-rhel-for-edge-images

## Issues Found
- The prerequisites incorrectly listed CentOS Stream 9 for a RHEL Image Builder guide based on Red Hat Enterprise Linux 9 documentation. Updated the prerequisite to RHEL 9 with Red Hat Subscription Manager or Red Hat Satellite, and added the documented BaseOS and AppStream repository requirement.
- The post used placeholder service paths and names such as `/etc/<service>/config.conf` and `<service-name>`. Replaced these with the documented RHEL Image Builder packages and services: `osbuild-composer`, `composer-cli`, `cockpit-composer`, `osbuild-composer.socket`, and `cockpit.socket`.
- The post omitted the actual package installation command. Added the documented `dnf install osbuild-composer composer-cli cockpit-composer` command.
- The service enable/start commands were generic and not executable as written. Replaced them with the documented `systemctl enable --now osbuild-composer.socket` and `systemctl enable --now cockpit.socket` commands.
- The verification and troubleshooting commands referenced placeholder services. Updated them to use `composer-cli status show`, `systemctl status osbuild-composer.socket cockpit.socket`, and `journalctl -u osbuild-composer.service`.
- The post did not explain how to reach Image Builder in Cockpit. Added the documented web console URL, `https://localhost:9090/`, and the navigation path through Apps to Image Builder.

## Review Notes
The post is now technically accurate for a basic RHEL 9 Image Builder installation through Cockpit. It remains intentionally brief and does not cover blueprint creation, image output types, or custom repository configuration.
