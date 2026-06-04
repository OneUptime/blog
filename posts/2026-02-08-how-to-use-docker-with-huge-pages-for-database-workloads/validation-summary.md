# Validation Summary: How to Use Docker with Huge Pages for Database Workloads

## Status
validated

## Post Type
Technical tutorial / configuration guide

## Technologies Covered
- Docker Engine and Docker Compose
- Linux HugeTLB and hugetlbfs
- Transparent Huge Pages
- PostgreSQL 16
- MySQL 8.0 / InnoDB
- pgbench
- Linux sysctl, GRUB, systemd, and process capabilities

## Sources Consulted
- PostgreSQL 16 documentation: Linux huge pages and `huge_pages` behavior: https://www.postgresql.org/docs/16/kernel-resources.html
- PostgreSQL Docker Official Image documentation: supported environment variables and `-c` configuration options: https://hub.docker.com/_/postgres
- Docker Engine `docker run` documentation: `--shm-size`, `--cap-add`, command arguments, and capabilities: https://docs.docker.com/engine/containers/run/
- Docker CLI `docker container run` documentation: `--ulimit memlock`: https://docs.docker.com/reference/cli/docker/container/run/
- Docker Compose services reference: `shm_size` and `ulimits`: https://docs.docker.com/reference/compose-file/services/
- Linux Kernel HugeTLB documentation: huge page pool, `/proc/meminfo`, `hugepagesz`, and `hugetlbfs`: https://www.kernel.org/doc/html/next/admin-guide/mm/hugetlbpage.html
- Linux man-pages `mmap(2)`: `MAP_HUGETLB` permission requirements: https://www.man7.org/linux/man-pages/man2/mmap.2.html
- Linux man-pages `proc_sys_vm(5)`: `vm.hugetlb_shm_group`: https://www.man7.org/linux/man-pages/man5/proc_sys_vm.5.html
- MySQL 8.0 documentation: `--large-pages` option and Linux HugeTLB support: https://dev.mysql.com/doc/refman/8.0/en/server-options.html
- MySQL 8.0 documentation: enabling large page support and memlock requirements: https://dev.mysql.com/doc/refman/8.0/en/large-page-support.html

## Issues Found
- The post incorrectly implied Docker's `--shm-size` enables huge pages. Updated the Docker section to clarify that `--shm-size` only sizes `/dev/shm`; HugeTLB use requires host allocation plus process permission.
- The PostgreSQL `docker run` example mounted `/dev/hugepages` and set `POSTGRES_SHARED_PRELOAD_LIBRARIES`, which is not a supported official image environment variable and did not enable PostgreSQL huge pages. Replaced it with `--cap-add IPC_LOCK`, `--ulimit memlock=-1:-1`, and PostgreSQL `-c huge_pages=on -c shared_buffers=8GB` startup options.
- The Compose example treated a hugetlbfs bind mount as the key container setting. Replaced that with `cap_add: IPC_LOCK` and `ulimits: memlock: -1`.
- The MySQL example omitted the memlock ulimit required for large page allocation and included `SYS_NICE`, which is not required for the huge page behavior described. Added `--ulimit memlock=-1:-1` and removed the unnecessary capability.
- The text said PostgreSQL could fall back to regular pages with `huge_pages = on`. PostgreSQL documents `huge_pages=on` as fail-fast when huge pages are unavailable, so the troubleshooting entry now says PostgreSQL fails to start.
- The benchmark commands referenced `testdb` without creating it and did not provide the password to `pgbench`. Added `POSTGRES_DB=testdb` and `PGPASSWORD=test`.
- The post implied hugetlbfs mounting is generally required. Added a clarification that the mount is optional for applications using `mmap` or System V shared memory, though useful for software that maps files from hugetlbfs.

## Review Notes
The corrected examples were reviewed against official documentation and local Docker CLI help. The database containers were not executed because validating actual HugeTLB allocation requires host-level huge page reservation, elevated kernel configuration, and potentially a reboot.
