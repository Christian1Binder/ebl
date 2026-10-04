// Für den Webspace-Umzug nur backend auf 'php' ändern. Pfade bleiben relativ,
// damit die Plattform sowohl im Hauptverzeichnis als auch unter /ebl/ läuft.
export const config = Object.freeze({backend: 'local', apiUrl: 'api/index.php', storageKey: 'ebl.v1', name: 'EBL Lernraum'});
