# Security Policy

> Last updated: `20261116`

## Reporting a Vulnerability

Email [hello@antranik.dev](mailto:hello@antranik.dev) with the subject "Pixelian security" and include:

- A description of the vulnerability
- Steps to reproduce
- The Pixelian version (`CORE_VERSION` from `js/core/config.js`, or check the `<meta name="generator">` tag)
- Any suggested mitigation

Do not open a public GitHub issue for security reports.

## Supported Versions

The latest minor release receives security fixes. Older minors are unsupported.

| Version | Supported |
| ------- | --------- |
| 1.3.x   | Yes       |
| 1.2.x   | No        |
| < 1.2   | No        |

## Scope

Pixelian is a template, not an application. Security issues in the template itself are in scope:

- Core primitives (`js/core/*.js`)
- The PHP entry point (`index.php`)
- The reference nginx config (`nginx.example.conf`)
- The reference shell script (`setup.sh`)

Out of scope:

- Vulnerabilities in applications built on top of Pixelian
- Vulnerabilities in modules added by the deploying project
- Issues in third-party services linked from the template
- Social engineering
- Denial of service through resource exhaustion

## Response

Reports are acknowledged within 7 days. Fixes are released as a patch (PATCH version bump) and credited in `CHANGELOG.md` unless the reporter requests anonymity.
