# Validation Summary: How to Install Ruby 3.2 on RHEL Using AppStream

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- AppStream module streams
- DNF module commands
- Ruby
- RubyGems
- Bundler

## Sources Consulted
- Red Hat Enterprise Linux Application Streams Life Cycle: https://access.redhat.com/support/policy/updates/rhel-app-streams-life-cycle
- Red Hat Enterprise Linux 9.4 Release Notes, Ruby 3.3 module stream: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.4_release_notes/new-features
- Red Hat Enterprise Linux 9, Managing software with the DNF tool: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/managing_software_with_the_dnf_tool
- RubyGems Command Reference: https://guides.rubygems.org/command-reference/
- Bundler bundle install documentation: https://bundler.io/man/bundle-install.1.html
- Bundler bundle exec documentation: https://bundler.io/man/bundle-exec.1.html

## Issues Found
- RHEL 9 AppStream does not provide a Ruby 3.2 module stream. Red Hat documents Ruby 3.0, retired Ruby 3.1, and supported Ruby 3.3 for RHEL 9. Updated the post title, description, commands, expected version output, and user gem PATH from Ruby 3.2 to Ruby 3.3.
- The available-streams comment listed Ruby 3.2. Updated it to list supported/current examples, Ruby 3.0 and Ruby 3.3.
- The version-switching example enabled Ruby 3.1, which is retired in RHEL 9 as of March 2025. Updated the example to use Red Hat's documented `dnf module switch-to ruby:3.3` command for upgrading from an earlier Ruby module stream.
- The IRB verification command used `irb -e 'puts RUBY_VERSION'` under a comment saying it launches interactive Ruby. Updated it to `irb`, which matches the described action.

## Review Notes
The revised guide is accurate for RHEL 9.4 and later systems where the `ruby:3.3` module stream is available. Systems on earlier RHEL 9 minor releases may need to update or enable appropriate repositories before the stream appears.
