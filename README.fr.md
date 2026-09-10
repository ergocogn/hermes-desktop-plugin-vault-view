# Vault View

**Votre vault compatible avec Obsidian, directement dans Hermes Desktop.**

[English](README.md) · [Français](README.fr.md)

[![Version v0.4.3](https://img.shields.io/badge/version-v0.4.3-2563eb)](https://github.com/ergocogn/hermes-desktop-plugin-vault-view/releases/tag/v0.4.3)
[![Installer dans Hermes Desktop](https://img.shields.io/badge/Installer%20dans-Hermes%20Desktop-2563eb)](hermes://plugin/install?repo=ergocogn/hermes-desktop-plugin-vault-view)

![Vault View affichant une note Markdown liée, l’explorateur, le plan et le graphe dans Hermes Desktop](screenshots/vault-view-light.png)

Vault View intègre votre base de connaissances Markdown à la conversation. Retrouvez une note, demandez à Hermes de la créer ou de la mettre à jour, suivez ses liens et gardez plusieurs notes ouvertes dans un espace conçu pour un vault plutôt que dans un simple aperçu de fichier.

## Rechercher. Créer. Naviguer.

| Rechercher dans le vault | Créer et modifier | Explorer les liens |
| --- | --- | --- |
| Recherchez des notes, parcourez les dossiers, filtrez les tags et consultez les liens. | Écrivez directement ou demandez à Hermes d’utiliser son intégration Obsidian CLI configurée. | Suivez les wikilinks, utilisez Précédent et Suivant, ouvrez des onglets ou naviguez dans le graphe. |

![Paramètres de Vault View avec détection du vault, choix de la langue et contrôles de confidentialité](screenshots/vault-view-settings.png)

## Fonctionnalités

- Lecture visuelle et édition Markdown
- Création, renommage, déplacement et suppression de notes et dossiers
- Recherche, explorateur, plan, tags, backlinks, liens sortants et graphe du vault
- Wikilinks, callouts Obsidian et images locales
- Plusieurs onglets avec leur propre historique de navigation
- Actualisation automatique après une modification par Hermes, Obsidian CLI ou un autre éditeur
- Compatibilité avec les thèmes Hermes clairs et sombres
- Interface en français, en anglais ou suivant automatiquement la langue de Hermes Desktop
- Commandes principalement représentées par des icônes, avec libellés et infobulles traduits

## Fonctionnement avec Hermes

L’agent Hermes continue d’utiliser son intégration Obsidian CLI existante pour les opérations sur les notes. Vault View fournit l’affichage destiné à l’utilisateur et remplace l’aperçu générique pour les tâches liées à Obsidian. Il peut afficher une note, en ouvrir plusieurs simultanément ou rester masqué pour une opération en arrière-plan.

## Installation

Vault View est un Desktop Plugin Hermes autonome. Il ne nécessite ni compilation, ni paquet npm, ni composant Python.

### Installation en un clic

Ouvrez cette page sur l’ordinateur où Hermes Desktop est installé, puis sélectionnez **Installer dans Hermes Desktop** :

[**Installer Vault View dans Hermes Desktop**](hermes://plugin/install?repo=ergocogn/hermes-desktop-plugin-vault-view)

Hermes demande une confirmation avant l’installation. Si ce lien n’est pas pris en charge par votre version de Hermes Desktop, utilisez l’installation manuelle ci-dessous.

### Installation manuelle

1. Copiez ce dépôt dans le dossier actif des plugins Hermes Desktop sous le nom `vault-view`.
2. Vérifiez que le point d’entrée est `$HERMES_HOME/desktop-plugins/vault-view/plugin.js`.
3. Rechargez les Desktop Plugins dans les paramètres Hermes.
4. Activez **Vault View**.

Utilisez le dossier indiqué par Hermes Desktop. L’application Desktop et son backend peuvent utiliser des emplacements différents, notamment avec WSL ou une machine virtuelle.

## Configuration

Vault View recherche automatiquement le vault déjà configuré dans Hermes par `WIKI_PATH`. Si aucun vault `.obsidian` valide n’est trouvé, sélectionnez sa racine dans les paramètres.

Le réglage de langue propose **Suivre Hermes Desktop**, **English** et **Français**. Le même panneau permet de restaurer les onglets, de réinitialiser les panneaux et d’activer facultativement le partage de métadonnées sur la note active.

## Confidentialité

- Les fichiers du vault restent sur le système de fichiers local configuré.
- Aucun jeton, identifiant, chemin personnel ou contenu de note n’est intégré au plugin.
- Le contenu complet d’une note n’est jamais joint automatiquement à l’agent.
- Le partage facultatif de la note active est désactivé par défaut et ne transmet que des métadonnées légères.
- Le chemin du vault reste dans le stockage local privé de Vault View.

Les captures utilisent un vault de démonstration synthétique. Elles ne contiennent aucun chemin personnel, aucune conversation privée ni note réelle ; leurs métadonnées PNG ont été supprimées.

## Compatibilité

- Hermes Desktop avec prise en charge des Desktop Plugins
- Vault Markdown local compatible avec Obsidian
- Windows, macOS ou Linux, à condition que le backend Hermes actif puisse accéder au vault

## Support et contributions

Utilisez les [GitHub Issues](https://github.com/ergocogn/hermes-desktop-plugin-vault-view/issues) pour le support, les bugs et les propositions. Consultez [CONTRIBUTING.md](CONTRIBUTING.md), [SUPPORT.md](SUPPORT.md) et [SECURITY.md](SECURITY.md) avant de partager des journaux ou des captures.

## Projet indépendant

Vault View est un projet communautaire indépendant publié par ergoCogn sàrl. Il n’est ni affilié, ni sponsorisé, ni approuvé par Dynalist Inc., l’éditeur d’Obsidian, ou par Nous Research, le mainteneur d’Hermes. Les noms de produits servent uniquement à décrire la compatibilité.

## Licence

[MIT](LICENSE) © 2026 ergoCogn sàrl
