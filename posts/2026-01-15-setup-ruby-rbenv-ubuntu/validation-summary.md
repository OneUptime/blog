# Validation Summary: How to Set Up Ruby with rbenv on Ubuntu

## Status
validated

## Post Type
Tutorial / Setup Guide

## Technologies Covered
- Ubuntu
- Ruby
- rbenv
- ruby-build
- RubyGems
- Bundler
- Ruby on Rails
- GitHub Actions
- Visual Studio Code Ruby LSP
- Solargraph
- RuboCop
- Puma

## Sources Consulted
- rbenv README: https://github.com/rbenv/rbenv
- ruby-build README: https://github.com/rbenv/ruby-build
- ruby-build manual: https://rbenv.org/man/ruby-build.1
- Ruby downloads and releases: https://www.ruby-lang.org/en/downloads/ and https://www.ruby-lang.org/en/downloads/releases/
- Bundler `bundle install` manual: https://bundler.io/man/bundle-install.1.html
- Bundler `bundle config` manual: https://bundler.io/man/bundle-config.1.html
- Ruby on Rails command line guide: https://guides.rubyonrails.org/command_line.html
- GitHub Actions Ruby guide / ruby/setup-ruby usage: https://docs.github.com/actions/tutorials/build-and-test-code/building-and-testing-ruby
- Ruby LSP VS Code extension metadata: https://github.com/Shopify/ruby-lsp
- RuboCop configuration documentation: https://docs.rubocop.org/rubocop/latest/configuration.html
- RuboCop RSpec documentation: https://docs.rubocop.org/rubocop-rspec_rails/latest/index.html
- Puma documentation / README: https://github.com/puma/puma

## Issues Found
- Replaced Ubuntu package names `libreadline6-dev` and `libncurses5-dev` with the generic development packages `libreadline-dev` and `libncurses-dev`, and removed the runtime-specific `libgdbm6` package from the install command. This makes the dependency command more portable across supported Ubuntu releases.
- Replaced the non-standard `rbenv doctor` command with the documented `rbenv-doctor` script invocation from the rbenv installer project.
- Updated stale Ruby examples from `3.3.0`, `3.2.2`, and broad Ruby 2.7 examples to currently maintained Ruby 3.x patch releases where appropriate. Ruby's official downloads page lists Ruby 4.0.5 as the current stable release and Ruby 3.4.9, 3.3.11, and 3.2.11 as stable releases as of the review date.
- Replaced `rbenv install -L` with the clearer `rbenv install --list-all` form.
- Replaced deprecated `bundle install --without development test` usage with `bundle config set --local without 'development test'` followed by `bundle install`, matching Bundler's current guidance.
- Added `rubocop-rspec` to the example Gemfile because the provided `.rubocop.yml` requires `rubocop-rspec`.
- Updated the VS Code Ruby configuration from older `ruby.*` and Solargraph-specific settings to current Ruby LSP settings, including the current object form of `rubyLsp.rubyVersionManager`.
- Fixed Ruby LSP launch examples so they invoke `ruby ${file}` and `bundle exec rspec ${file}` instead of assuming the current file or `bin/rspec` is directly executable.
- Replaced the non-standard `rbenv migrate` command with explicit gem-list export and reinstall commands for users who need global gem executables after a Ruby upgrade.
- Replaced `git pull origin master` update examples with `git pull`, avoiding assumptions about the default branch name.
- Removed recommendations to install `libssl1.1` directly on Ubuntu, since that package is not available on current supported Ubuntu releases. The troubleshooting text now recommends updating ruby-build first and only using a specific OpenSSL path if the user has installed one.
- Fixed a broken `apt install` multiline command where inline comments after backslashes would prevent shell line continuation from working.

## Review Notes
The tutorial is technically relevant and generally useful after the fixes. Some examples still use Rails 7.1 and legacy Ruby 2.7 troubleshooting because they are valid in context, but users should verify framework and gem compatibility before moving an application to Ruby 4.0.
