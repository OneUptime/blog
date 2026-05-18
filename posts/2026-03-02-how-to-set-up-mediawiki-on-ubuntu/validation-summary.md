# Validation Summary: How to Set Up MediaWiki on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide (step-by-step installation guide)

## Technologies Covered
- MediaWiki 1.41
- Ubuntu 20.04 / 22.04
- nginx (with PHP-FPM)
- PHP 8.1
- MySQL
- Certbot (Let's Encrypt)
- MediaWiki extensions (Cite, ParserFunctions, CategoryTree, SyntaxHighlight_GeSHi)

## Sources Consulted
- MediaWiki Manual: CheckSyntax.php — https://www.mediawiki.org/wiki/Manual:CheckSyntax.php
- MediaWiki Manual: Maintenance scripts — https://www.mediawiki.org/wiki/Manual:Maintenance_scripts
- MediaWiki Manual: Maintenance scripts / List of scripts — https://www.mediawiki.org/wiki/Manual:Maintenance_scripts/List_of_scripts
- MediaWiki Manual: Version.php — https://www.mediawiki.org/wiki/Manual:Version.php
- MediaWiki Manual: Configuration settings — https://www.mediawiki.org/wiki/Manual:Configuration_settings
- MediaWiki Manual: $wgMemCachedServers
- MediaWiki Download page — https://www.mediawiki.org/wiki/Download
- MediaWiki Extension Distributor — https://www.mediawiki.org/wiki/Special:ExtensionDistributor

## Issues Found

1. **`checkSyntax.php` does not exist in MediaWiki 1.41.** The post recommended running `sudo -u www-data php /var/www/mediawiki/maintenance/checkSyntax.php` as a "built-in environment check". This script was completely removed from MediaWiki in version 1.31. Replaced with `version.php`, which is a real maintenance script that confirms core can be loaded and prints version/build information — a reasonable smoke test in a troubleshooting context.

2. **Incorrect description for `rebuildrecentchanges.php`.** The post labeled it as "Rebuild the search index", which is wrong — that script rebuilds the `recentchanges` table (not the search index). Updated the comment to accurately describe its purpose ("Rebuild the recentchanges table"). The full-text search index rebuild script is a different one (`rebuildtextindex.php`), but I chose to correct the comment rather than swap the script to keep the change minimal.

3. **VisualEditor / Cite content mismatch.** The "Installing Extensions" section introduced "Install the VisualEditor for WYSIWYG editing as an example", but the commands that followed actually installed the Cite extension. Updated the introductory sentence to match what is actually installed (Cite).

## Review Notes

- **MediaWiki version (1.41.1).** This was current at the time of the post; as of validation date (2026-05-18) newer releases exist (1.43 is the current LTS). The post explicitly tells the reader to check the official Download page for the latest version, so the example version pin is acceptable, but readers should be aware that they will most likely want a more recent release.
- **PHP-FPM socket path (`php8.1-fpm.sock`).** Correct for Ubuntu 22.04's default PHP, but Ubuntu 20.04 ships PHP 7.4 by default, so on 20.04 the socket would be `php7.4-fpm.sock` unless a newer PHP is installed from a PPA (ondrej/php). Worth flagging for readers who pick the 20.04 path.
- **Cite extension download URL.** Uses the ExtensionDistributor pattern with a placeholder hash (`Cite-REL1_41-xxxxxx.tar.gz`). The URL pattern is correct, but readers must visit the ExtensionDistributor to get the actual signed URL with hash — the post would benefit from making this explicit, but the pattern itself isn't technically wrong.
- **`$wgUsePathInfo`** is still a valid configuration option and is correctly used for clean URLs.
- **SMTP `IDHost` key** is correct — despite the unusual casing, this matches the documented PHPMailer-style key MediaWiki expects.
- **`$wgMemCachedServers = []`** with `$wgMainCacheType = CACHE_ACCEL` is harmless; the empty array is simply unused when APCu is the cache type, but it doesn't cause any errors.
