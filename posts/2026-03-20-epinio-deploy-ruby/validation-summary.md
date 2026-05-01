# Validation Summary: How to Deploy a Ruby Application with Epinio

## Status
validated

## Post Type
Guide

## Technologies Covered
- Epinio
- Ruby
- Sinatra
- Puma
- Bundler
- Kubernetes
- Paketo Buildpacks

## Sources Consulted
- Epinio introduction: https://docs.epinio.io/
- Epinio supported applications: https://docs.epinio.io/references/supported_applications
- Epinio `push` command reference: https://docs.epinio.io/references/commands/cli/epinio_push
- Epinio `app update` command reference: https://docs.epinio.io/references/commands/cli/app/epinio_app_update
- Epinio quickstart: https://docs.epinio.io/tutorials/quickstart
- Epinio single developer journey: https://docs.epinio.io/tutorials/single-dev-workflow
- Epinio custom routes: https://docs.epinio.io/howtos/custom_routes
- Paketo Ruby buildpack reference: https://paketo.io/docs/reference/ruby-reference/
- Paketo Ruby buildpack how-to: https://paketo.io/docs/howto/ruby/

## Issues Found
- The post was presented as a Ruby on Rails guide, but the actual sample application was a Bash loop plus a separate Node.js example. I replaced that with a real Ruby example using `Gemfile`, Sinatra, Puma, and `config.ru`, and corrected the description and tags so the post matches its content.
- The route lookup commands were incorrect. Current Epinio output shows `Routes:` followed by numbered URL lines, so `grep Routes | awk '{print $2}'` would not return the application URL. I changed the commands to extract the actual `http`/`https` URL from `epinio app show`.
- The namespace verification step used `epinio namespace show my-apps` while claiming to verify the active namespace. I changed it to `epinio target`, which is the documented way to display the current targeted namespace.
- The browser example used `open`, which is macOS-specific. I replaced it with `printf` so the tutorial remains portable and still gives the user the application URL.
- The update section claimed that Epinio performs a rolling update. I did not find current official documentation supporting that exact statement, so I changed the line to a neutral verification step.
- The conclusion said developers can deploy "any application" with Epinio. Current Epinio docs describe supported applications in terms of Paketo buildpack compatibility or pre-built images, so I corrected that claim to "supported applications."

## Review Notes
- The post is now technically aligned with the current Epinio 1.13.10 documentation reviewed on May 1, 2026.
- The workspace did not have the `epinio` CLI installed, so command syntax was validated against official documentation rather than local `--help` output.
- The sample now uses Sinatra and Puma because Paketo's Ruby buildpack explicitly documents Bundler-based dependency installation and automatic launch configuration for supported Ruby webservers. If a future revision wants to be Rails-specific, it should use an actual Rails application and Rails asset-pipeline requirements.
