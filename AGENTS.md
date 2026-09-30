# Architecture decisions

- Keep ambient background motion isolated in `AmbientMotion`; this centralizes device defaults, preferences, and pointer behavior.