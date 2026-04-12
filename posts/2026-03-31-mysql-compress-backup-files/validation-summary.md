# Validation Summary: How to Compress MySQL Backup Files

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (`mysqldump`)
- gzip / gunzip / zcat
- bzip2 / bzcat
- zstd
- pigz (parallel gzip)
- OpenSSL (encryption)

## Sources Consulted
- MySQL `mysqldump` official documentation: https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html
- gzip man page (`gzip -h`): flags `-k`, `-9`, `-t`, `-1` through `-9` compression levels
- bzip2 man page: `-t` integrity test flag
- zstd man page: `-o` output file flag, `-d` decompression flag, stdin/stdout behavior
- pigz man page: `-p` thread count flag
- OpenSSL `enc` command documentation: `-aes-256-cbc`, `-salt`, `-pbkdf2`, `-pass` options

## Issues Found
No technical issues found.

## Review Notes
- The compression ratio figures (88%, 91%, 89%) are presented as illustrative for a typical 10 GB database. Actual ratios vary depending on data content, but the ballpark is reasonable for SQL text dumps.
- The `apt install pigz` command omits `sudo`, which is common in blog posts that assume a root context or leave privilege escalation to the reader.
- The `--single-transaction` flag is correctly used in the initial examples for consistent InnoDB backups and appropriately omitted in later abbreviated examples that focus on compression syntax.
- All pipe-based workflows correctly rely on mysqldump writing SQL to stdout and the password prompt going to stderr, so the pipe does not interfere with the interactive password prompt.
