(function () {
  'use strict';
  const stepCents = 40000;
  // Shared reveal content for the landing page and OBS overlays.
  const reveals = [
    {
      title: 'Mūsu komanda',
      description: 'Ingars, Mairis, Boriss, Kris Brand un Stasis',
      image: {
        src: 'team-reveal.jpg',
        width: 1086,
        height: 1448,
        alt: 'Pieci ASV brauciena komandas dalībnieki Floridas saulrieta fonā.'
      }
    },
    {
      title: 'Everglades',
      description: 'Dodamies meklēt krokodilus — cerams, izdosies tos arī nofilmēt!',
      image: {
        src: 'everglades-reveal.jpg',
        width: 1086,
        height: 1448,
        alt: 'Krokodils Evergleidsas ūdeņos un laiva ar lielu propelleru zilgani violetā krēslā.'
      }
    }
  ];
  function milestones(goalCents) {
    const result = [];
    for (let amountCents = stepCents; amountCents < goalCents; amountCents += stepCents) {
      result.push({ amountCents, label: (result.length + 1) + '. noslēpums' });
    }
    result.push({ amountCents: goalCents, label: 'Florida!' });
    return result;
  }
  function reveal(index, count) {
    return index === count - 1
      ? { title: 'Florida!', description: 'Kopā sasniegts brauciena mērķis!' }
      : reveals[index] || { title: 'Atklājums ' + (index + 1), description: 'Vēl viens Florida piedzīvojums.' };
  }
  function progress(goalCents, total) {
    const goals = milestones(goalCents);
    const completed = goals.filter(goal => goal.amountCents <= total).length;
    const next = goals[completed];
    const previous = completed ? goals[completed - 1].amountCents : 0;
    const target = next ? next.amountCents - previous : 0;
    const collected = next ? Math.max(0, total - previous) : 0;
    return { goals, completed, next, collected, target, remaining: next ? next.amountCents - total : 0 };
  }
  window.DonationGoals = { stepCents, milestones, reveal, progress };
})();
