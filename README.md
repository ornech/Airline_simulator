Rôles de l'Orchestrateur et des Workers Avions
**📌 1. Rôle de l'**🛫 Orchestrateur (orchestrator2.js)

L’orchestrateur joue le rôle du centre de contrôle des opérations aériennes. Il :

    Lance et surveille les Workers Avions (un Worker par avion).
    Gère l'horloge simulée et avance le temps en fonction de la vitesse configurée.
    Gère l'API Express qui permet à l'interface web d'afficher les vols et la situation des avions.
    Génère des vols dans la Table Flights de la DB.
    Détecte les vols en attente (status de la table Flights -> "Scheduled")
    
    Possède une variable ou est stocké la disponibilité de chaque workerairplane. Cette varaible est modifié en s'appuyant surles échange entre les workerairplane et l'orchestrateur. Ces échanges se traduise par un message du worker vers l'orchestrateur.
     
    Logique de communication avec un workerairplane lors d'un intérrogation d'un worker pour une demande de vol:
	1) Fait une demande à chaque workerairplane dont le status est "IDLE" s'il peut effectuer ce vol.
	2) Si la réponse du worker est négative, l'orchestrteur contacte le worker suivant
	3) Le premier workerairplane qui répond positivement est assigné à ce vol. (UPDATE Aircraft_ID (ID du worker airplane qui à répondu positivement) et Status (="Assigned") de la table Flights)


📌 2. Rôle des Workers Avions (workerAirplane.js)

    Chaque Worker Avion représente un avion en temps réel.Son role est de communiquer à l'orchestrateur et mettre à jours ses données sur ce qu'il est en train de faire.
    
    Le Worker Avion ne doit pas s’appuyer sur son propre horloge système, mais sur l’horloge simulée envoyée par l’orchestrateur.
    
    Identifier le type de demande de l'orchestrateur:
    	- demande de vol
    
    Chaque workerairplane possède une liste de variables:
    	- son ID
    	- Position
    	- dep, aéroport de départ
    	- arr, aéroport de destination
    	- vitesse
    	- status
    	
    Chaque workerairplane peut uniquement modifier (UPDATE) la ligne correspondante à son Airplane_ID de la table Airplane de la DB.
    Chaque workerairplane possède une liste de status:
    	- IDLE (inactif)
    	- Boarding (embarquement en cours)
    	- In-Flight (envol)
    	- Approaching (en approche)
    	- On ground (au sol mais toujours actif)
    	
    Recevoir les demandes de vol de l’orchestrateur. 
	- Une réponse est soit positive soit négative.
	- Une réponse est obligatoirement négative si la variable status du worker est autre que "iDLE"
	- Si la variable status du worker est "iDLE" alors la réponse à la demande de vol de l'orchestrateur est positive
	
    S'il peut répondre favorablement à une demande de vol (il met à jour lestatus de la table Flights -> "Assigned")
    
    Logique de fonctionnement des variables au cours d'un vol:
    
    - Chaque chagement de status est accompagné d'une mise à jour de la variable, de la base de données ( Table Aircrafts colonne Status) et d'un message à l'orchestrateur pour l'informer des différents changement de statu de ce worker.
    - 45 min avant le décollage prévue et jusqu'à l'heure de départ prévue,il met à jour le status passe à "Boarding"
    - Depuis l'heure du décollage prévue jusqu'à 20 min avant l'heure d'arrivé prévue 2, le status de la table Flights sera "In-Flight".
    - 20 min avant l'heure d'arrivé prévue jusqu'à l'heure d'arrivée prévue, le status de la table Flights sera "Approaching"
    - 20 min avant l'heure d'arrivé prévue,il met à jour le status de la table Flights -> "Approaching"
    - 20 min après l'heure d'arrivé prévue,il met à jour le status de la table Flights -> "On-Ground"
    - Dans les autres périodes le status est sur "IDLE"
    - Informe l'orchestrateur que son status vient de passé sur IDLE.

# 📜 Workflow des statuts mis à jour

| **Étape**                         | **Statut**       | **Action du Worker**            | **Mise à jour dans la Base**                                     | **Notification à l’orchestrateur**              |
|------------------------------------|-----------------|---------------------------------|-----------------------------------------------------------------|-------------------------------------------------|
| **1️⃣ Création**                   | `Scheduled`     | Le vol est ajouté à la base.   | ✅ Aucun avion n’est assigné.                                   | _Aucune notification._                         |
| **2️⃣ Acceptation du vol**         | `On-Time`       | Un avion accepte le vol.       | ✅ `Airplane_ID` est mis à jour. <br> ✅ Statut → `On-Time`      | ✅ **L’orchestrateur loggue l’acceptation.**    |
| **3️⃣ 45 min avant le départ**     | `Boarding`      | Début de l'embarquement.       | ✅ `Status` → `Boarding`                                        | ✅ **Le worker envoie un message à l’orchestrateur.** |
| **4️⃣ À l’heure du départ**        | `In-Flight`     | Décollage de l’avion.          | ✅ `Status` → `In-Flight`                                       | ✅ **Le worker envoie un message à l’orchestrateur.** |
| **5️⃣ 20 min avant l’atterrissage** | `Approaching`   | L’avion commence son approche. | ✅ `Status` → `Approaching`                                     | ✅ **Le worker envoie un message à l’orchestrateur.** |
| **6️⃣ À l’atterrissage**           | `On-Ground`     | L’avion atterrit.              | ✅ `Status` → `On-Ground`                                       | ✅ **Le worker envoie un message à l’orchestrateur.** |
| **7️⃣ 20 min après l’atterrissage** | `Completed` + `IDLE` | L’avion est libre. | ✅ `Status` → `Completed` (Vol terminé) <br> ✅ L’avion devient `IDLE` | ✅ **Le worker envoie un message à l’orchestrateur.** |

    

