# Validation Summary: How to Use argon2 for Password Hashing with MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- Mongoose ODM
- Node.js `argon2` npm package
- Node.js `bcrypt` npm package
- Argon2 password hashing algorithm (argon2d, argon2i, argon2id variants)

## Sources Consulted
- argon2 npm package documentation: https://github.com/ranisalt/node-argon2
- OWASP Password Storage Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- Mongoose middleware documentation: https://mongoosejs.com/docs/middleware.html
- Argon2 reference specification (RFC 9106): https://www.rfc-editor.org/rfc/rfc9106

## Issues Found

### 1. `argon2` variable scoping error in migration code
- **What was wrong:** In the "Migrating from bcrypt to argon2" section, `const argon2 = require('argon2')` was declared inside the `if` block (block-scoped with `const`), but `argon2.verify()` was called in the `else` block. This would throw a `ReferenceError` at runtime for any non-bcrypt user.
- **What was changed:** Moved the `require('argon2')` to the top of the code snippet alongside the `require('bcrypt')` declaration, making it available in both branches.

### 2. Double-hashing bug in migration code
- **What was wrong:** The migration code called `user.password = await argon2.hash(plaintext)` and then `await user.save()`. Since the User model (defined earlier in the post) has a pre-save hook that hashes the password whenever it is modified, this would result in the password being hashed twice — the argon2 hash string would itself be hashed again by the pre-save hook.
- **What was changed:** Replaced `user.password = await argon2.hash(plaintext)` with `user.password = plaintext` to let the pre-save hook handle the hashing, consistent with the rehash-on-login pattern shown in the previous section of the same post.

## Review Notes
- The argon2 variant descriptions are accurate. The post correctly notes argon2id as the OWASP-recommended default. The description of argon2i as "Recommended for password hashing" is slightly dated (argon2id has superseded it as the recommendation), but not technically wrong — it was historically the recommendation and remains a valid choice.
- The OWASP-recommended parameters (memoryCost: 19456, timeCost: 2, parallelism: 1) match OWASP's second recommended configuration for argon2id. This is correct.
- The `memoryCost` unit in the `argon2` npm package is KiB, so 65536 = 64 MiB and 19456 ~= 19 MiB. The comments saying "64 MB" and "19 MB" are approximately correct (MiB vs MB difference is minor and acceptable for a blog post).
- The bcrypt migration check only looks for `$2b$` prefix. Older bcrypt hashes may start with `$2a$` or `$2y$`. This is acceptable for a tutorial since the Node.js `bcrypt` package generates `$2b$` hashes, but production code should consider all bcrypt prefixes.
- The `argon2.needsRehash()` API usage is correct per the node-argon2 package documentation.
