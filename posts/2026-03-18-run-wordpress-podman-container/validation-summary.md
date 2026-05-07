# Validation Summary: How to Run WordPress in a Podman Container

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman pods and networks
- WordPress official container image
- MariaDB official container image
- WordPress themes and plugins
- PHP
- WP-CLI

## Sources Consulted
- Podman pod create documentation: https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html
- Red Hat container documentation on communicating between containers in a pod: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/building_running_and_managing_containers/assembly_communicating-among-containers_building-running-and-managing-containers
- WordPress official Docker image documentation: https://hub.docker.com/_/wordpress
- MariaDB official Docker image documentation: https://hub.docker.com/_/mariadb
- WP-CLI installation documentation: https://wp-cli.org/
- WordPress.org 40% web usage announcement: https://wordpress.org/40-percent-of-web/

## Issues Found
- The standalone setup reused the same `wp-db-data` and `wp-content` volumes as the pod setup. This could make the standalone database container share the same MariaDB data directory as the pod database container if both examples are run, which is unsafe. Updated the standalone setup to create and use `wp-db-standalone-data` and `wp-content-standalone`, and updated cleanup commands accordingly.
- The `wp-custom` and `wp-dev` examples started additional WordPress containers in the same pod while `wp-app` or another WordPress container could still be running. Containers in a Podman pod share the same network namespace, so multiple Apache containers listening on port 80 would conflict. Added removal commands before starting the alternate WordPress containers.
- The WP-CLI section assumed the container was always named `wp-app`, but earlier alternate examples use `wp-custom` or `wp-dev`. Added a note to use the name of the active WordPress container.

## Review Notes
- The Podman CLI was not installed in the local environment, so command behavior was checked against official Podman documentation rather than local `--help` output.
- The `sleep 10` waits are acceptable for a simple tutorial, but MariaDB initialization time can vary on slower systems. A future improvement could use a readiness loop or health check before starting WordPress.
