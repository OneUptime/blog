# Validation Summary: How to Use Ansible to Manage Ruby Gems

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- community.general.gem
- community.general.bundler
- RubyGems
- Bundler
- rbenv
- Ruby on Rails deployment workflows

## Sources Consulted
- Ansible community.general.gem module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/gem_module.html
- Ansible community.general.bundler module documentation: https://docs.ansible.com/ansible/latest/collections/community/general/bundler_module.html
- RubyGems command reference: https://guides.rubygems.org/command-reference/
- Bundler bundle install documentation: https://bundler.io/man/bundle-install.1.html
- rbenv official README: https://github.com/rbenv/rbenv

## Issues Found
- The post used `ansible.builtin.gem`, but the current documented module is `community.general.gem` from the `community.general` collection. Updated the prose and all examples to use `community.general.gem`.
- The post stated that gem installations are system-level by default. Current `community.general.gem` defaults `user_install` to true, so the text now explains that user-local installation is the default and that `user_install: false` is needed for system-wide or rbenv-managed installs.
- The rbenv examples installed Bundler without disabling user-local installation. Added `user_install: false` so gems install into the selected rbenv Ruby instead of the user's separate gem cache.
- The Rails deployment playbook attempted to clone into `/opt/{{ app_name }}` as the deploy user without first creating a deploy-owned directory. Added explicit deploy group creation and a directory task with the correct owner, group, and mode.
- The Rails deployment playbook referenced rbenv shims but did not refresh them after installing Bundler. Added a `rbenv rehash` task.
- The Bundler explanation described `deployment_mode` as equivalent to `bundle install --deployment`. Updated the wording because Bundler documents the command-line flag as deprecated in favor of the persistent deployment setting, while the Ansible module parameter remains valid.
- The private gem source example used `gem sources --add` and always reported changed. Updated it to use `gem sources --prepend`, matching RubyGems guidance for private sources, and made `changed_when` depend on command output.
- The documentation section said gem installations generate documentation by default. Updated it to clarify that `community.general.gem` skips documentation by default, while direct `gem` command usage can be controlled through gemrc.

## Review Notes
The Rails playbook remains an illustrative deployment workflow and assumes rbenv plus the target Ruby version are already installed for the deploy user. A future revision could add OS-family conditionals around the Debian-specific package list if the play targets mixed Linux distributions.
