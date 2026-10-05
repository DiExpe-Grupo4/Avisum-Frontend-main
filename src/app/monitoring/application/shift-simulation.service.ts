import { Injectable, signal } from '@angular/core';

export type EstadoSim = 'EN_RUTA' | 'FINALIZADO' | 'NO_LABORABLE';

export interface FilaAnteriorSim {
  id: string;
  conductorId: number;
  fecha: Date;
  duracionSegundos: number;
  km: number;
  pasajeros: number;
  recaudado: number;
}

interface SimEnRuta {
  estado: 'EN_RUTA';
  inicio: Date;
  km: number;
  pasajeros: number;
  recaudado: number;
}
interface SimFinalizado {
  estado: 'FINALIZADO';
  inicio: Date;
  km: number;
  pasajeros: number;
  recaudado: number;
}
interface SimNoLaborable {
  estado: 'NO_LABORABLE';
}
type Simulado = SimEnRuta | SimFinalizado | SimNoLaborable;

/**
 * Guarda el estado simulado de "Historial de Turnos" en un singleton de toda la sesión
 * del navegador (no en el componente), para que no se vuelva a repartir cada vez que
 * el admin entra y sale de la pantalla. Solo se reinicia con un F5 real.
 */
@Injectable({ providedIn: 'root' })
export class ShiftSimulationService {
  private simulados = new Map<number, Simulado>();
  readonly anteriores: FilaAnteriorSim[] = [];
  readonly tick = signal(0);

  constructor() {
    setInterval(() => {
      this.avanzar();
      this.tick.update((v) => v + 1);
    }, 1000);
  }

  obtener(conductorId: number): Simulado {
    this.asegurar(conductorId);
    return this.simulados.get(conductorId)!;
  }

  private asegurar(conductorId: number) {
    if (this.simulados.has(conductorId)) return;
    const r = Math.random();

    if (r < 0.55) {
      const minutosYaCorriendo = Math.floor(Math.random() * 40) + 1;
      this.simulados.set(conductorId, {
        estado: 'EN_RUTA',
        inicio: new Date(Date.now() - minutosYaCorriendo * 60000),
        km: +(Math.random() * 10).toFixed(1),
        pasajeros: Math.floor(Math.random() * 60),
        recaudado: +(Math.random() * 80).toFixed(2),
      });
    } else if (r < 0.8) {
      const inicio = new Date(Date.now() - (2 + Math.random() * 10) * 3600000);
      const km = +(5 + Math.random() * 20).toFixed(1);
      const pasajeros = Math.floor(Math.random() * 110);
      const recaudado = +(Math.random() * 200).toFixed(2);
      this.simulados.set(conductorId, { estado: 'FINALIZADO', inicio, km, pasajeros, recaudado });
      this.anteriores.push({
        id: `s-${conductorId}`,
        conductorId,
        fecha: new Date(Date.now() - (1 + Math.random() * 3) * 86400000),
        duracionSegundos: Math.floor(600 + Math.random() * 12000),
        km: +(2 + Math.random() * 20).toFixed(1),
        pasajeros: Math.floor(Math.random() * 110),
        recaudado: +(Math.random() * 200).toFixed(2),
      });
    } else {
      this.simulados.set(conductorId, { estado: 'NO_LABORABLE' });
    }
  }

  private avanzar() {
    for (const s of this.simulados.values()) {
      if (s.estado !== 'EN_RUTA') continue;
      s.km = +(s.km + 0.003).toFixed(3);
      if (Math.random() < 0.1) s.pasajeros += 1;
      if (Math.random() < 0.08) s.recaudado = +(s.recaudado + Math.random() * 2.5).toFixed(2);
    }
  }
}
