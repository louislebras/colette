# Dashboard Colette — configuration Supabase

## 1. Créer la table

Dans **Supabase > SQL Editor**, exécuter le contenu de [supabase/schema.sql](supabase/schema.sql).

## 2. Créer le seul compte de connexion

Dans **Authentication > Users > Add user** :

- saisir l’adresse email et le mot de passe de l’équipe Colette ;
- activer **Auto Confirm User** ;
- ne pas envoyer d’invitation par email.

Dans **Authentication > Providers > Email** :

- désactiver **Allow new users to sign up** ;
- laisser la connexion par email et mot de passe activée.

Le site ne contient aucun écran de création de compte : seuls les comptes créés manuellement dans Supabase peuvent se connecter.

## 3. Ajouter les variables Vercel

Dans **Vercel > Colette > Settings > Environment Variables**, créer ces variables pour `Production` et `Preview` :

| Variable | Valeur Supabase | Exposition |
| --- | --- | --- |
| `SUPABASE_URL` | Project URL | serveur |
| `SUPABASE_ANON_KEY` | Publishable / anon key | navigateur, via l’API de configuration |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role secret | serveur uniquement, jamais dans le navigateur |

Après ajout, redéployer le site afin que les fonctions de pré-réservation, le webhook Stripe et le dashboard reçoivent ces variables.

## Utilisation

Le dashboard est disponible sur `/dashboard/`.

- **À confirmer** : demandes reçues, avec email, téléphone et lien Stripe à relancer.
- **Payées** : paiements Stripe reçus ; le webhook les déplace automatiquement dans cet onglet.
- **Toutes** : les pré-réservations et paiements actifs. Une demande annulée est retirée des listes et son lien Stripe est expiré.

Le bouton « Relancer par email » ouvre un email prérempli ; « Appeler » compose directement le numéro du client. « Annuler » demande une confirmation, expire le lien Stripe et retire la demande des listes actives.
