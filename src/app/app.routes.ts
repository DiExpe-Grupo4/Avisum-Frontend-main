import { Routes } from '@angular/router';
import { conductorAuthGuard } from './iam/application/conductor-auth.guard';
import { adminAuthGuard } from './iam/application/admin-auth.guard';
// Shells compartidos (persisten entre rutas de su área)
const conductorLayout = () =>
  import('./shared/presentation/components/conductor-layout/conductor-layout').then(
    (m) => m.ConductorLayout,
  );
const adminLayout = () =>
  import('./shared/presentation/components/admin-layout/admin-layout').then((m) => m.AdminLayout);

// IAM
const login = () => import('./iam/presentation/views/login/login').then((m) => m.Login);
const accessAuthorized = () =>
  import('./iam/presentation/views/access-authorized/access-authorized').then(
    (m) => m.AccessAuthorized,
  );
const adminProfile = () =>
  import('./iam/presentation/views/admin-profile/admin-profile').then((m) => m.AdminProfile);
// Camera
const qrScanner = () =>
  import('./camera/presentation/views/qr-scanner/qr-scanner').then((m) => m.QrScanner);

// Alert management
const panicAlert = () =>
  import('./alert-management/presentation/views/panic-alert/panic-alert').then((m) => m.PanicAlert);
const alertLogs = () =>
  import('./alert-management/presentation/views/alert-logs/alert-logs').then((m) => m.AlertLogs);
const notifications = () =>
  import('./alert-management/presentation/views/notifications/notifications').then(
    (m) => m.Notifications,
  );

// Monitoring (fleet + turno del conductor)
const driverDashboard = () =>
  import('./monitoring/presentation/views/driver-dashboard/driver-dashboard').then(
    (m) => m.DriverDashboard,
  );
const viewMap = () =>
  import('./monitoring/presentation/views/view-map/view-map').then((m) => m.ViewMap);
const serviceSummary = () =>
  import('./monitoring/presentation/views/service-summary/service-summary').then(
    (m) => m.ServiceSummary,
  );
const passengerCount = () =>
  import('./monitoring/presentation/views/passenger-count/passenger-count').then(
    (m) => m.PassengerCount,
  );
const controlCenter = () =>
  import('./monitoring/presentation/views/dashboard/dashboard').then((m) => m.Dashboard);
const unitAssignment = () =>
  import('./monitoring/presentation/views/unit-assignment/unit-assignment').then(
    (m) => m.UnitAssignment,
  );
const shiftHistory = () =>
  import('./monitoring/presentation/views/shift-history/shift-history').then((m) => m.ShiftHistory);
const impactNumbers = () =>
  import('./monitoring/presentation/views/impact-numbers/impact-numbers').then(
    (m) => m.ImpactNumbers,
  );

// Users
const driverManagement = () =>
  import('./users/presentation/views/driver-management/driver-management').then(
    (m) => m.DriverManagement,
  );

// Profile
const profileView = () =>
  import('./profile/presentation/views/profile/profile').then((m) => m.Profile);

// Shared
const apiConsole = () =>
  import('./shared/presentation/views/api-console/api-console').then((m) => m.ApiConsole);
const pageNotFound = () =>
  import('./shared/presentation/views/page-not-found/page-not-found').then((m) => m.PageNotFound);

const baseTitle = 'Avisum | UrbanGuard';

export const routes: Routes = [
  // Rutas de conductor sin layout (login / verificación / pánico)
  { path: 'conductor/login', loadComponent: login, title: `${baseTitle} - Conductor` },
  { path: 'conductor/qr-scanner', loadComponent: qrScanner, title: `${baseTitle} - Conductor` },
  {
    path: 'conductor/access-authorized',
    loadComponent: accessAuthorized,
    canActivate: [conductorAuthGuard],
    title: `${baseTitle} - Conductor`,
  },
  {
    path: 'conductor/panic-alert',
    loadComponent: panicAlert,
    canActivate: [conductorAuthGuard],
    title: `${baseTitle} - Conductor`,
  },

  // Área conductor (con shell persistente)
  {
    path: 'conductor',
    loadComponent: conductorLayout,
    children: [
      { path: 'dashboard', loadComponent: driverDashboard, canActivate: [conductorAuthGuard] },
      { path: 'view-map', loadComponent: viewMap, canActivate: [conductorAuthGuard] },
      { path: 'service-summary', loadComponent: serviceSummary, canActivate: [conductorAuthGuard] },
      { path: 'passengers', loadComponent: passengerCount, canActivate: [conductorAuthGuard] },
      { path: 'alert-logs', loadComponent: alertLogs, canActivate: [conductorAuthGuard] },
      { path: 'profile', loadComponent: profileView, canActivate: [conductorAuthGuard] },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },

  // Área administración (con shell persistente)
  {
    path: 'admin',
    loadComponent: adminLayout,
    canActivate: [adminAuthGuard],
    children: [
      { path: 'control-center', loadComponent: controlCenter },
      { path: 'drivers', loadComponent: driverManagement },
      { path: 'units', loadComponent: unitAssignment },
      { path: 'api-console', loadComponent: apiConsole },
      { path: 'notifications', loadComponent: notifications },
      { path: 'shifts', loadComponent: shiftHistory },
      { path: 'impact', loadComponent: impactNumbers },
      { path: 'profile', loadComponent: adminProfile },
      { path: '', redirectTo: 'control-center', pathMatch: 'full' },
    ],
  },

  { path: '', redirectTo: '/conductor/login', pathMatch: 'full' },
  { path: '**', loadComponent: pageNotFound, title: `${baseTitle} - Not Found` },
];
