# Validation Summary: How to Use Ansible to Install Packages from Source

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Linux package installation from source
- GNU make
- Redis
- nginx
- checkinstall
- CMake
- Ninja
- systemd

## Sources Consulted
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `ansible.builtin.get_url` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/get_url_module.html
- Ansible `ansible.builtin.unarchive` module documentation: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/unarchive_module.html
- Ansible `ansible.builtin.systemd_service` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Redis source installation documentation: https://redis.io/docs/latest/operate/oss_and_stack/install/archive/install-redis/install-redis-from-source/
- Redis TLS documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/encryption/
- Redis configuration documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- Redis sample `redis.conf`: https://github.com/redis/redis/blob/unstable/redis.conf
- nginx source build documentation: https://nginx.org/en/docs/configure.html
- NGINX Open Source installation documentation: https://docs.nginx.com/nginx/admin-guide/installing-nginx/installing-nginx-open-source/
- Debian `checkinstall` manual page: https://manpages.debian.org/man/checkinstall
- CMake user interaction guide: https://cmake.org/cmake/help/latest/guide/user-interaction/index.html
- CMake `CMAKE_BUILD_TYPE` documentation: https://cmake.org/cmake/help/latest/variable/CMAKE_BUILD_TYPE.html
- GNU make parallel execution documentation: https://www.gnu.org/software/make/manual/html_node/Parallel.html

## Issues Found
- The Redis example compiled with `BUILD_TLS=yes` but did not install OpenSSL development headers. Redis documents that TLS builds require OpenSSL development libraries such as `libssl-dev` on Debian/Ubuntu, so `libssl-dev` was added to the build dependency list.
- The Redis systemd unit used `Type=notify`, but the copied default `redis.conf` does not enable systemd supervision by default. The `ExecStart` command now passes `--supervised systemd`, which matches Redis' documented command-line configuration format and allows Redis to notify systemd correctly.
- The Redis systemd unit created `/var/lib/redis` but did not point Redis at it. The `ExecStart` command now passes `--dir /var/lib/redis` so persistence files are written under the managed Redis data directory.
- The Redis playbook comment said it installed "the latest version" while pinning `redis_version: "7.2.4"`. The wording was changed to "a selected version" to avoid a false version-specific claim.
- The upgrade section said the pattern involved removing the old version, but the example stops the service and overwrites the installed binary rather than removing files first. The description was corrected to match the code.

## Review Notes
The examples are Debian/Ubuntu-oriented because they use `ansible.builtin.apt` and Debian package names. The generic source-build pattern is accurate, but production playbooks should also verify source checksums for real downloads, pin source versions or commits, and handle service restarts after rebuilds.
