// Hunt data. Everything a team needs to edit lives here.
//
// DRAFT: coordinates come from the Bucknell campus-map building list (building
// centroids). Re-measure each spot with tools/scout.html before the showcase,
// add 3-4 reference photos per gem, and tune threshold with the scout tool.
//
// Fields:
//   id        folder name under gems/ (reference photos live in gems/<id>/)
//   name      shown after the gem is found
//   clue      the riddle that leads players to the spot
//   hints     revealed one at a time when the player asks
//   lat, lng  where the player should stand when taking the photo
//   radiusM   how close (meters) counts as "here"; use 40-60 for indoor spots
//   threshold minimum photo similarity (0-1) to pass; calibrate with scout
//   refs      reference photo filenames inside gems/<id>/
//   fact      the reward: a fact most people walk past

export const HUNT = {
  title: 'Hidden Gems',
  subtitle: 'The Best of Bucknell',
  // Judges test the first gem at the showcase, so it must stay within 500 ft.
  taylorHall: { lat: 40.95716, lng: -76.8831 },
};

export const GEMS = [
  {
    id: 'taylor',
    name: 'Where It All Began',
    clue: 'Before the Quad, before the Bison, one building stood alone on the hill. Find the oldest walls on campus and photograph the doorway that started it all.',
    hints: [
      'It was built in 1849 and named for the man who wrote the University charter.',
      'You may be standing in it right now. Look for Taylor Hall\'s main entrance.',
    ],
    lat: 40.95716, lng: -76.8831,
    radiusM: 45,
    threshold: 0.6,
    refs: [],
    fact: 'Taylor Hall (1849) was the first building on College Hill. Everything else grew around it.',
  },
  {
    id: 'greenhouse',
    name: 'The Jungle on the Roof',
    clue: 'Somewhere above the lab benches, it is always summer. Climb toward the glass and photograph the green.',
    hints: [
      'Science lives next door to the oldest hall on campus. Look up.',
      'The Biology Building has a rooftop greenhouse.',
    ],
    lat: 40.956233, lng: -76.883091,
    radiusM: 50,
    threshold: 0.6,
    refs: [],
    fact: 'The Biology Building opened in 1991 with a greenhouse on its roof.',
  },
  {
    id: 'art',
    name: 'Studio Since 1890',
    clue: 'This building has made artists for more than a century. Find its oldest face and capture it.',
    hints: [
      'Head toward Seventh Street, uphill from Taylor.',
      'It is the Art Building.',
    ],
    lat: 40.95805, lng: -76.88389,
    radiusM: 40,
    threshold: 0.6,
    refs: [],
    fact: 'The Art Building was built in 1890 and still holds studios and classrooms.',
  },
  {
    id: 'maproom',
    name: 'The Room Under the Books',
    clue: 'Go below the place everyone studies. Behind a quiet door, the whole world is folded into drawers.',
    hints: [
      'Bertrand Library has more floors than most people visit.',
      'Lower Level One: the Map Room.',
    ],
    lat: 40.95434, lng: -76.88265,
    radiusM: 60,
    threshold: 0.6,
    refs: [],
    fact: 'Bertrand Library\'s Map Room has reference maps, a computer table, and one of the comfiest couches on campus.',
  },
];
