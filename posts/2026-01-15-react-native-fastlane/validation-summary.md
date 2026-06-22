# Validation Summary: How to Automate React Native Builds with Fastlane

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Fastlane (lanes, Fastfile, Appfile, Matchfile)
- React Native build automation
- iOS deployment (gym, scan, match/sync_code_signing, pilot/upload_to_testflight, deliver)
- Android deployment (gradle, supply/upload_to_play_store)
- App Store Connect API key authentication
- Google Play service account JSON key
- Fastlane plugins (versioning, versioning_android, firebase_app_distribution, badge)
- GitHub Actions and Bitrise CI/CD
- Ruby (Fastfile DSL)

## Sources Consulted
- fastlane actions documentation (slack) — https://docs.fastlane.tools/actions/slack/
- fastlane slack action source — https://github.com/fastlane/fastlane/blob/master/fastlane/lib/fastlane/actions/slack.rb
- fastlane-plugin-versioning_android (beplus) — https://github.com/beplus/fastlane-plugin-versioning_android
- android_get_version_code action source (versioning_android) — https://github.com/beplus/fastlane-plugin-versioning_android/blob/master/lib/fastlane/plugin/versioning_android/actions/android_get_version_code.rb
- fastlane plugins / add_plugin documentation and general fastlane action references

## Issues Found
- **Incorrect plugin install for Slack notifications.** The "Useful Plugins" section instructed readers to run `fastlane add_plugin slack`. `slack` is a built-in fastlane action shipped with the core gem — there is no `fastlane-plugin-slack` gem, so this command would fail with a plugin-not-found error. Removed the erroneous `add_plugin slack` line and added a short note clarifying that the `slack` action is built in and can be used directly (which is consistent with the rest of the post, where `slack(...)` is already called without installing a plugin).

## Review Notes
- The versioning_android plugin uses inconsistent parameter naming, and the post correctly reflects it: the `increment_version_code` / `increment_version_name` actions take `gradle_file_path`, while `android_get_version_code` / `android_get_version_name` / `android_set_version_name` take `gradle_file`. This is not an error — it matches the plugin's actual API.
- `include_bitcode: false` is used in the gym lanes. This is still a valid gym option, but bitcode itself has been deprecated by Apple (Xcode 14+ no longer supports bitcode submissions). Leaving `include_bitcode: false` is harmless and effectively the correct/expected value today.
- `app_store_connect_api_key(duration: 1200, ...)` uses the maximum allowed token lifetime (1200 seconds / 20 minutes), which is correct.
- The remaining plugins referenced (`versioning`, `versioning_android`, `firebase_app_distribution`, `badge`) are all real, published fastlane plugins.
- All other actions used (gym, scan, match/sync_code_signing, cocoapods, increment_build_number, increment_version_number, get_version_number, commit_version_bump, upload_to_testflight/pilot, deliver, gradle, upload_to_play_store, update_code_signing_settings, register_devices, capture_screenshots, frame_screenshots, clear_derived_data, clean_build_artifacts, add_git_tag, push_git_tags) are valid built-in fastlane actions, and the shared values (`SharedValues::IPA_OUTPUT_PATH`, `SharedValues::GRADLE_AAB_OUTPUT_PATH`) are correct.
- CI/CD snippets (GitHub Actions `ruby/setup-ruby@v1` with `working-directory`/`bundler-cache`, `actions/setup-node@v4`, `actions/setup-java@v4`, and the Bitrise `fastlane@3` step with `work_dir`) are syntactically valid and use current action versions.
