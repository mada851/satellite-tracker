// User-facing categories mapped to CelesTrak GP "GROUP" slugs.
// Multi-group categories are fetched in parallel, merged and deduped by NORAD id.
// Slugs verified against https://celestrak.org/NORAD/elements/ (Current Data page).
export const CATEGORIES = [
  { id: 'all', label: 'All Active', description: 'Every active satellite (large — thousands)', groups: ['active'] },
  { id: 'stations', label: 'Space Stations', description: 'ISS, CSS and other crewed stations', groups: ['stations'] },
  { id: 'geo', label: 'Geostationary', description: 'Satellites in the geostationary belt', groups: ['geo'] },
  { id: 'starlink', label: 'Starlink', description: 'SpaceX Starlink constellation (large)', groups: ['starlink'] },
  { id: 'oneweb', label: 'OneWeb', description: 'OneWeb broadband constellation', groups: ['oneweb'] },
  {
    id: 'navigation',
    label: 'Navigation (GNSS)',
    description: 'GPS, Galileo, GLONASS and BeiDou',
    groups: ['gps-ops', 'galileo', 'glo-ops', 'beidou'],
  },
  { id: 'weather', label: 'Weather', description: 'Weather and environmental satellites', groups: ['weather', 'noaa', 'goes'] },
  {
    id: 'communications',
    label: 'Communications',
    description: 'Intelsat, SES, Iridium, Orbcomm, Globalstar, amateur radio',
    groups: ['intelsat', 'ses', 'iridium-NEXT', 'orbcomm', 'globalstar', 'amateur'],
  },
];

export function getCategory(id) {
  return CATEGORIES.find((c) => c.id === id);
}
