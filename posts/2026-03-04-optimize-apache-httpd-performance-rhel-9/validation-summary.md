# Validation Summary: How to Optimize Apache httpd Performance on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Apache HTTP Server httpd 2.4
- Apache MPM event, worker, and prefork
- Apache KeepAlive settings
- Apache mod_deflate compression
- Apache mod_expires browser caching
- Apache .htaccess and AllowOverride behavior
- Apache Bench ab
- Apache mod_status
- systemd and dnf

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Setting up the Apache HTTP web server: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/deploying_web_servers_and_reverse_proxies/setting-apache-http-server_deploying-web-servers-and-reverse-proxies
- Red Hat JBoss Core Services Apache HTTP Server guide, Multi-Processing Modules appendix: https://docs.redhat.com/en/documentation/red_hat_jboss_core_services/2.4.57/pdf/apache_http_server_connectors_and_load_balancing_guide/Red_Hat_JBoss_Core_Services-2.4.57-Apache_HTTP_Server_Connectors_and_Load_Balancing_Guide-en-US.pdf
- Apache HTTP Server 2.4 MPM common directives: https://httpd.apache.org/docs/2.4/en/mod/mpm_common.html
- Apache HTTP Server 2.4 performance tuning guide: https://httpd.apache.org/docs/2.4/en/misc/perf-tuning.html
- Apache HTTP Server 2.4 core directives: https://httpd.apache.org/docs/current/en/mod/core.html
- Apache HTTP Server 2.4 mod_deflate documentation: https://httpd.apache.org/docs/current/mod/mod_deflate.html
- Apache HTTP Server 2.4 mod_expires documentation: https://httpd.apache.org/docs/current/mod/mod_expires.html
- Apache HTTP Server 2.4 mod_status documentation: https://httpd.apache.org/docs/current/mod/mod_status.html

## Issues Found
- The post said users running `mod_php` are stuck with `prefork`. On RHEL 9, Red Hat documents that `mod_php` has been removed and PHP runs through `php-fpm` by default. I changed the wording to describe `prefork` as relevant to legacy embedded PHP or non-thread-safe modules and noted that RHEL 9 PHP normally does not require `prefork`.
- The post described `MaxRequestWorkers` as the maximum number of simultaneous connections. Apache documentation defines it as the limit on simultaneous requests, and for threaded/hybrid MPMs it restricts serving threads. I changed the explanation to distinguish served requests from idle keep-alive connections under the event MPM.
- The memory sizing command used `ps aux | grep httpd`, which includes the `grep` process and can skew the average. I changed it to `ps -C httpd -o rss=` with an `awk` guard for empty output.
- The memory sizing explanation mixed child processes and worker threads. I clarified that RSS is measured per child process, then related the process estimate to `ThreadsPerChild` and `MaxRequestWorkers`.

## Review Notes
The remaining Apache directives and commands are technically valid for RHEL 9/httpd 2.4. The tuning values are reasonable examples, but production values still need workload-specific benchmarking and monitoring.
