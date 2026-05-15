# Validation Summary: How to Build and Deploy a Rust Web Service with Actix on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Rust
- Cargo
- Actix Web
- systemd
- Nginx
- SELinux
- firewalld

## Sources Consulted
- Actix Web Getting Started: https://actix.rs/docs/getting-started/
- Actix Web Server documentation: https://actix.rs/docs/server/
- Rust installation documentation: https://www.rust-lang.org/tools/install/
- Cargo manifest documentation: https://doc.rust-lang.org/cargo/reference/manifest.html
- Red Hat DNF documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/managing_software_with_the_dnf_tool/
- Red Hat firewalld documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld
- Red Hat SELinux HTTP server booleans documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/selinux_users_and_administrators_guide/sect-managing_confined_services-the_apache_http_server-booleans
- systemd.service documentation: https://www.freedesktop.org/software/systemd/man/systemd.service.html
- systemd.exec documentation: https://www.freedesktop.org/software/systemd/man/systemd.exec.html
- NGINX proxy documentation: https://docs.nginx.com/nginx/deployment-guides/load-balance-third-party/node-js/

## Issues Found
- The Rust example used `num_cpus::get()` but did not declare the `num_cpus` crate in `Cargo.toml`. Added `num_cpus = "1"` so the example compiles.
- The introduction said Actix Web is built on "Rust's async runtime", which is misleading because Rust does not ship a built-in async runtime. Changed the wording to "an async runtime in Rust."

## Review Notes
- Extracted the post's `Cargo.toml` and Rust source into a temporary project and verified the corrected example with `cargo check`.
- Actix Web's default worker count is already based on physical CPUs; the explicit `.workers(num_cpus::get())` is valid after adding the dependency, though it is not strictly necessary.
- `env_logger = "0.10"` is not the latest available release, but the API used in the post remains valid.
