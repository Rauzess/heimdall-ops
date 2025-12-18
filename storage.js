const STORAGE_KEY = "ronda_presets_v1";

export const Storage = {
  // Pega todos os presets salvos
  getAll() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  // Salva um novo preset
  save(name, activities) {
    const presets = this.getAll();
    const newPreset = {
      id: Date.now().toString(), // ID único
      name: name,
      activities: activities,
    };
    presets.push(newPreset);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
    return newPreset;
  },

  // Deleta um preset pelo ID
  delete(id) {
    const presets = this.getAll().filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  },
};
