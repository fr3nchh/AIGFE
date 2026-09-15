# 🔒 Security Policy - LocalAI

## Securite fondamentale

LocalAI est concu pour que **aucune donnee ne quitte jamais votre appareil**.

### Ce qui ne sort PAS de votre machine :
- ❌ Vos conversations
- ❌ Vos prompts
- ❌ Les reponses de l'IA
- ❌ Vos documents
- ❌ Votre historique
- ❌ Des metadonnees d'utilisation
- ❌ Aucun telemetry
- ❌ Aucun analytics

### Ce qui sort (uniquement) :
- ✅ Telechargement initial des modeles (une seule fois)
- ✅ Mises a jour de modeles (optionnel)

## Chiffrement

### Cote client (navigateur)
- AES-256-GCM pour les conversations stockees
- La cle reste dans votre navigateur (localStorage)
- Le serveur ne voit que du texte chiffre

### Cote serveur
- Aucun stockage en clair
- Les conversations sont chiffrees avant stockage
- Le serveur ne peut PAS lire vos messages

## Bonnes pratiques

1. **Changez la cle secrete** dans `.env` :
   ```
   WEBUI_SECRET_KEY=une-cle-tres-longue-et-aleatoire
   ```

2. **Limitez l'acces reseau** avec un pare-feu :
   ```bash
   # Autoriser uniquement le reseau local
   ufw allow from 192.168.0.0/16 to any port 3000
   ```

3. **Activez le chiffrement** dans les parametres de l'interface

4. **Supprimez les donnees** quand vous voulez :
   - Bouton "Supprimer toutes les donnees" dans les parametres
   - Ou supprimez le dossier `data/`

## Signaler une vulnerability

Si vous trouvez une faille de securite, contactez-nous via GitHub Issues avec le tag [SECURITY].

Ne publiez jamais une vulnerability publiquement.
