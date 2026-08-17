import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  query, 
  orderBy 
} from "firebase/firestore";
import { db } from "./firebase";

const COLLECTION_NAME = "citas";
const CONFIG_DOC_PATH = ["configuracion", "barberia"];

/**
 * Escuchador en tiempo real para las citas registradas en la colección.
 */
export const subscribeToCitas = (callback) => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
    return onSnapshot(
      q, 
      (snapshot) => {
        const citas = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data()
        }));
        callback(citas);
      },
      (error) => {
        console.error("Error escuchando citas en tiempo real:", error);
      }
    );
  } catch (err) {
    console.error("Error al suscribirse a Firestore:", err);
    return () => {};
  }
};

/**
 * Guarda una cita en Firestore en segundo plano.
 */
export const addCitaAsync = async (citaData) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...citaData,
      createdAt: citaData.createdAt || new Date().toISOString()
    });
    return { ok: true, id: docRef.id };
  } catch (error) {
    console.error("Error al guardar cita en Firestore:", error);
    throw error;
  }
};

/**
 * Actualiza el estado de una cita ("confirmed", "done", "cancelled").
 */
export const updateCitaStatus = async (citaId, status) => {
  try {
    const citaRef = doc(db, COLLECTION_NAME, citaId);
    await updateDoc(citaRef, { status });
    return { ok: true };
  } catch (error) {
    console.error("Error actualizando estado de cita:", error);
    return { ok: false, error };
  }
};

/**
 * Elimina una cita de la base de datos.
 */
export const deleteCita = async (citaId) => {
  try {
    const citaRef = doc(db, COLLECTION_NAME, citaId);
    await deleteDoc(citaRef);
    return { ok: true };
  } catch (error) {
    console.error("Error eliminando cita:", error);
    return { ok: false, error };
  }
};

/**
 * Escuchador en tiempo real para la configuración del negocio.
 */
export const subscribeToConfig = (callback) => {
  try {
    const configRef = doc(db, ...CONFIG_DOC_PATH);
    return onSnapshot(configRef, (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data());
      }
    });
  } catch (err) {
    console.error("Error leyendo configuración:", err);
    return () => {};
  }
};

/**
 * Guarda la configuración general en Firestore.
 */
export const updateConfigAsync = async (newConfig) => {
  try {
    const configRef = doc(db, ...CONFIG_DOC_PATH);
    await setDoc(configRef, newConfig, { merge: true });
    return { ok: true };
  } catch (error) {
    console.error("Error actualizando la configuración:", error);
    return { ok: false, error };
  }
};