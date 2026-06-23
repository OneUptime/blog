# Validation Summary: How to Set Up Pages Deployment in GitLab CI

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- GitLab CI/CD
- GitLab Pages
- GitLab Pages custom domains, DNS, and HTTPS
- GitLab Pages parallel deployments
- Vite / React
- Vue CLI
- Next.js static export
- Hugo
- Jekyll
- MkDocs
- Sphinx

## Sources Consulted
- GitLab Pages documentation: https://docs.gitlab.com/user/project/pages/
- GitLab CI/CD YAML syntax reference, including `pages`, `pages.publish`, and `pages.path_prefix`: https://docs.gitlab.com/ci/yaml/
- GitLab Pages custom domains and SSL/TLS certificates: https://docs.gitlab.com/user/project/pages/custom_domains_ssl_tls_certification/
- GitLab Pages parallel deployments: https://docs.gitlab.com/user/project/pages/parallel_deployments/
- GitLab predefined CI/CD variables, including `CI_PAGES_URL`: https://docs.gitlab.com/ci/variables/predefined_variables/
- Vite shared and build options: https://vite.dev/config/shared-options and https://vite.dev/config/build-options
- Vue CLI configuration reference for `publicPath`: https://cli.vuejs.org/config/
- Next.js static export and `basePath` documentation: https://nextjs.org/docs/app/guides/static-exports and https://nextjs.org/docs/app/api-reference/config/next-config-js/basePath
- Next.js static export image optimization guidance: https://nextjs.org/docs/messages/export-image-api
- Hugo `baseURL` documentation: https://gohugo.io/methods/site/baseurl/
- MkDocs CLI documentation for `--site-dir`: https://www.mkdocs.org/user-guide/cli/
- Sphinx build documentation: https://www.sphinx-doc.org/en/master/man/sphinx-build.html

## Issues Found
- The post said the Pages job must be named exactly `pages`. Current GitLab documentation supports user-defined job names when the job includes the `pages` keyword. Updated the explanation and all examples to use `deploy_pages` with `pages: true` or `pages.path_prefix`.
- The Vue CLI example used `process.env.CI_PAGES_URL` in `vue.config.js`, but `CI_PAGES_URL` is a job-only variable and may not be available during a separate build job. Changed the example to use the required GitLab Pages subpath directly with `publicPath: '/project-name/'`.
- The custom domain DNS example omitted GitLab's required TXT verification records and IPv6 record. Added TXT verification records for root and subdomain examples and added the documented GitLab.com AAAA record.
- The custom domain and HTTPS UI paths used older wording. Updated them to the current Deploy > Pages navigation used by GitLab documentation.
- The merge request preview example used a review-app-style job that would publish only normal artifacts, not a distinct Pages deployment. Replaced it with GitLab Pages parallel deployments using `pages.path_prefix` and `expire_in`.
- The complete pipeline created a Netlify/Cloudflare-style `_headers` file for security headers. GitLab Pages user documentation does not support per-project `_headers` files for response headers; replaced it with guidance to configure headers at a CDN, reverse proxy, or self-managed GitLab Pages server.
- The best practices section said to set cache headers without explaining where that is supported. Clarified that cache headers should be configured at the CDN, reverse proxy, or self-managed GitLab Pages server.

## Review Notes
The YAML examples were parsed successfully after editing. The framework-specific build commands and configuration options checked were otherwise consistent with current official documentation. GitLab Pages parallel deployments use `pages.path_prefix`; availability and limits can depend on GitLab tier and instance configuration.
