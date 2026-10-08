# Routine horaire — Témoignages du forum → réseaux sociaux

Ce fichier est le mode d'emploi exécuté **chaque heure** par la Routine Claude Code.
Il transforme les messages positifs du Forum des Ephores en publications LinkedIn, X, Facebook et TikTok.

- Forum : https://forum.ephore-market.com (Discourse, lecture publique)
- Marque : **Ephore Market** — fondateur : **Elio** (pseudo forum `Elio`)
- Publication : Metricool, marque « Ephore Market », `blogId` = `6391439`, fuseau `Asia/Dubai`
- Branche Git qui porte l'état : `claude/optimistic-turing-ox4kue`
- Mode choisi par Elio : **100 % automatique**, pseudo + avatar **visibles**, **sans limite** de volume.

## 0. Se mettre à jour

```bash
cd <racine du dépôt>
git fetch origin claude/optimistic-turing-ox4kue
git checkout claude/optimistic-turing-ox4kue
git pull --ff-only origin claude/optimistic-turing-ox4kue
cd automations/forum-testimonials
```

## 1. Récupérer les nouveaux messages

```bash
node fetch-new-posts.cjs > /tmp/forum-new.json
```

Sortie : `newest_post_id` et `posts[]` (du plus ancien au plus récent), déjà filtrés
(sans les messages d'Elio ni des comptes automatiques). `own_text` = le texte de l'auteur
sans les citations ; `raw` = le message complet avec citations.

Si `posts` est vide : mettre `last_seen_post_id` = `newest_post_id` dans `state.json`, committer, pousser, terminer.

## 2. Sélectionner les témoignages

Lire chaque message en entier et le retenir **seulement si** l'auteur y exprime, avec ses propres mots,
quelque chose de positif sur :

- Ephore Market (la plateforme, le cockpit, les outils, la méthode, les setups, la communauté, le forum) ;
- **Elio** (son accompagnement, ses analyses, sa pédagogie) ;
- un **résultat** ou une **réalisation** du membre obtenu avec Ephore Market : gain, journal mensuel positif,
  challenge prop firm validé, payout, régularité, progrès de discipline, gestion émotionnelle, déclic.

Rejeter :

- les messages où le positif n'est que dans la citation d'un autre membre (`own_text` neutre) ;
- les messages trop courts ou sans substance (« merci », « top », un emoji seul) ;
- les échanges techniques, questions, bugs, plaintes, sarcasme, messages ambigus ;
- les messages qui contiennent des données personnelles (nom réel, e-mail, téléphone, n° de compte) ;
- un message déjà présent dans `state.json` → `published` ;
- un message qui parle de la **même réalisation** qu'un témoignage déjà retenu (ex. les félicitations d'un membre
  sous le résultat d'un autre) : garder uniquement le message le plus fort, de préférence celui de l'auteur du résultat.

En cas de doute, ne pas publier. Mieux vaut rater un témoignage que publier un message mal compris.

## 3. Capturer chaque témoignage retenu

```bash
node screenshot.cjs <post_id> screenshots/<post_id>.png
```

Ouvrir la capture (outil Read) et vérifier : message complet, lisible, images chargées, pas de bandeau parasite.
Si la capture est mauvaise, relancer une fois ; si elle reste mauvaise, ignorer ce message (le noter dans `skipped`).

Pousser **avant** de programmer, car Metricool télécharge l'image depuis GitHub :

```bash
git add screenshots/<post_id>.png
git commit -m "forum-testimonials: capture du message <post_id>"
git push -u origin claude/optimistic-turing-ox4kue
```

URL publique de l'image (à vérifier avec `curl -sI`, attendre un code 200) :
`https://raw.githubusercontent.com/madfest82/claude-mem/claude/optimistic-turing-ox4kue/automations/forum-testimonials/screenshots/<post_id>.png`

## 4. Écrire le copywriting — un texte différent par réseau

Langue : français. Le texte doit coller **exactement** à ce que montre la capture : citer les vrais chiffres
(ex. « +4,55 % sur le mois, 83 % de trades gagnants »), les vrais mots du membre, son pseudo.
Ne jamais inventer, gonfler ou extrapoler un chiffre ; ne jamais promettre de gains.

Ressorts à utiliser : accroche qui arrête le scroll dans la 1re ligne (chiffre précis, citation forte,
contraste avant/après, question), preuve sociale (« c'est un membre qui le dit, pas nous »),
curiosité (ce qui a rendu ça possible), spécificité, émotion (plaisir de trader, sérénité, fierté),
appel à l'action clair vers https://ephore-market.com.

**LinkedIn** (profil personnel d'Elio — écrire à la 1re personne, voix du fondateur)
- 900 à 1 500 caractères. Accroche d'une ligne, puis ligne vide.
- Paragraphes d'1 à 2 lignes. Récit : ce que vit le membre → ce que ça montre (discipline, méthode, process)
  → la leçon pour tout trader → CTA doux (« Le lien est en commentaire » est interdit : mettre le lien dans le texte).
- 3 à 5 hashtags à la fin (#trading #propfirm #discipline #EphoreMarket …). Ton : professionnel, humain, fier sans arrogance.

**X** (@Ephoremarket)
- Un seul post, **≤ 270 caractères** (lien compris). Pas de thread.
- Accroche choc + chiffre ou citation courte + lien. 1 à 2 hashtags maximum.

**Facebook** (page Ephore Market)
- 400 à 800 caractères. Ton chaleureux, communautaire, quelques emojis bien placés.
- Mettre en avant la communauté (« sur notre forum, Dywen nous partage… »), question finale pour faire réagir, lien.

**TikTok** (photo)
- Titre (`tiktokData.title`) : ≤ 90 caractères, accrocheur.
- Description : 150 à 300 caractères, ton direct et jeune, 3 à 5 hashtags (#trading #trader #propfirm #bourse …).

**Mention obligatoire** sur chaque réseau (dernière ligne, adaptée à la longueur) :
- LinkedIn / Facebook / TikTok : « Résultat individuel d'un membre, non représentatif. Les performances passées ne préjugent pas des performances futures. Le trading comporte un risque de perte en capital. »
- X : « Perf. passées ≠ futures. Risque de perte en capital. »

## 5. Programmer dans Metricool

Pour chaque témoignage, **4 appels** `createScheduledPost` (un par réseau, puisque le texte diffère) :

- `blogId` : `6391439`
- `date` / `publicationDate` : maintenant + 15 min (fuseau `Asia/Dubai`), puis +20 min pour chaque témoignage
  supplémentaire de la même exécution, afin d'espacer les publications.
- `media` : `["<URL raw GitHub de la capture>"]`
- `mediaAltText` : `["Capture d'un message du forum Ephore Market par <auteur>"]`
- `autoPublish` : `true`, `draft` : `false`

`providers` / `networkData` par appel :

| Réseau   | providers                  | networkData |
|----------|----------------------------|-------------|
| LinkedIn | `[{"network":"linkedin"}]` | `"linkedinData": {"type": "post", "previewIncluded": true, "publishImagesAsPDF": false}` |
| X        | `[{"network":"twitter"}]`  | `"twitterData": {"tags": []}` |
| Facebook | `[{"network":"facebook"}]` | `"facebookData": {"type": "POST"}` |
| TikTok   | `[{"network":"tiktok"}]`   | `"tiktokData": {"title": "<titre>", "privacyOption": "PUBLIC_TO_EVERYONE", "commercialContentOwnBrand": true, "autoAddMusic": true}` |

Si un appel échoue (ex. texte trop long sur X) : raccourcir le texte une fois et réessayer ; sinon, noter l'erreur
dans `state.json` et continuer avec les autres réseaux.

## 6. Mettre à jour l'état et pousser

Dans `state.json` :
- `last_seen_post_id` = `newest_post_id` de l'étape 1 ;
- ajouter à `published` une entrée par témoignage :
  `{"post_id", "author", "url", "screenshot", "scheduled_at", "networks": {"linkedin": "<plannerUrl ou erreur>", ...}}` ;
- ajouter à `skipped` (liste de `post_id`) les candidats écartés à l'étape 3.

```bash
git add state.json
git commit -m "forum-testimonials: run du <date> — <n> témoignage(s) programmé(s)"
git push -u origin claude/optimistic-turing-ox4kue
```

## 7. Compte rendu

Terminer par un résumé court : nombre de messages lus, témoignages retenus (auteur + lien forum),
liens Metricool, erreurs éventuelles. Si rien n'a été retenu, une seule ligne suffit.
